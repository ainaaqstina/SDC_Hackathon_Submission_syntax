export type AdzunaCategory = {
  label: string;
  tag: string;
};

export type AdzunaListing = {
  externalId: string;
  title: string;
  company: string | null;
  location: string | null;
  category: string | null;
  listingUrl: string;
  postedAt: Date | null;
};

export class AdzunaApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdzunaApiError";
  }
}

const ADZUNA_MIN_REQUEST_INTERVAL_MS = 1_000;
let nextRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

const waitForAdzunaRequestSlot = async (): Promise<void> => {
  let release: () => void = () => {};
  const previousRequest = requestQueue;
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previousRequest;
  try {
    const delay = nextRequestAt - Date.now();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + ADZUNA_MIN_REQUEST_INTERVAL_MS;
  } finally {
    release();
  }
};

const getCredentials = () => {
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = process.env.ADZUNA_APP_KEY?.trim();
  if (!appId || !appKey) {
    throw new AdzunaApiError(
      "Adzuna is not connected. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in Replit Secrets.",
      503,
    );
  }
  return { appId, appKey };
};

export const normalizeAdzunaCountryCode = (value: string): string => {
  const countryCode = value.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(countryCode)) {
    throw new AdzunaApiError("Enter a two-letter country code and verify it with Adzuna.", 400);
  }
  return countryCode;
};

const requestAdzuna = async <T>(countryCode: string, endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const credentials = getCredentials();
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/${endpoint}`);
  url.searchParams.set("app_id", credentials.appId);
  url.searchParams.set("app_key", credentials.appKey);
  url.searchParams.set("content-type", "application/json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    await waitForAdzunaRequestSlot();
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AdzunaApiError("Adzuna did not respond before the request timed out.", 504);
    }
    throw new AdzunaApiError("Adzuna could not be reached. Check the connection and try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    if (response.status === 400 || response.status === 404) {
      throw new AdzunaApiError(
        `Adzuna did not recognize country code ${countryCode.toUpperCase()}. No listings were imported.`,
        400,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new AdzunaApiError("Adzuna rejected the configured credentials or access.", 502);
    }
    throw new AdzunaApiError(`Adzuna returned HTTP ${response.status}. No listings were imported.`, 502);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new AdzunaApiError("Adzuna returned a response that was not valid JSON.", 502);
  }
};

export const discoverAdzunaCategories = async (countryCode: string): Promise<AdzunaCategory[]> => {
  const country = normalizeAdzunaCountryCode(countryCode);
  const response = await requestAdzuna<{ results?: unknown[] }>(country, "categories");
  if (!Array.isArray(response.results) || response.results.length === 0) {
    throw new AdzunaApiError(
      `Adzuna returned no categories for ${country.toUpperCase()}; country support could not be verified.`,
      400,
    );
  }
  return response.results
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const tag = typeof item.tag === "string" ? item.tag.trim() : "";
      return label && tag ? { label, tag } : null;
    })
    .filter((item): item is AdzunaCategory => item !== null);
};

export const fetchAdzunaListings = async (
  countryCode: string,
  categories: AdzunaCategory[],
  pagesPerCategory: number,
): Promise<{ listings: AdzunaListing[]; skipped: number }> => {
  const country = normalizeAdzunaCountryCode(countryCode);
  const uniqueListings = new Map<string, AdzunaListing>();
  let skipped = 0;
  for (const category of categories) {
    for (let page = 1; page <= pagesPerCategory; page += 1) {
      const response = await requestAdzuna<{ results?: unknown[] }>(country, `search/${page}`, {
        category: category.tag,
        results_per_page: "50",
        sort_by: "date",
      });
      const results = Array.isArray(response.results) ? response.results : [];
      for (const raw of results) {
        if (!raw || typeof raw !== "object") {
          skipped += 1;
          continue;
        }
        const item = raw as Record<string, unknown>;
        const externalId =
          typeof item.adref === "string"
            ? item.adref
            : typeof item.id === "number" || typeof item.id === "string"
              ? String(item.id)
              : "";
        const title = typeof item.title === "string" ? item.title.trim() : "";
        const listingUrl = typeof item.redirect_url === "string" ? item.redirect_url.trim() : "";
        if (!externalId || !title || !/^https?:\/\//i.test(listingUrl)) {
          skipped += 1;
          continue;
        }
        const company =
          item.company && typeof item.company === "object" &&
          typeof (item.company as Record<string, unknown>).display_name === "string"
            ? ((item.company as Record<string, unknown>).display_name as string)
            : null;
        const location =
          item.location && typeof item.location === "object" &&
          typeof (item.location as Record<string, unknown>).display_name === "string"
            ? ((item.location as Record<string, unknown>).display_name as string)
            : null;
        const rawCategory =
          item.category && typeof item.category === "object" &&
          typeof (item.category as Record<string, unknown>).label === "string"
            ? ((item.category as Record<string, unknown>).label as string)
            : category.label;
        const createdAt = typeof item.created === "string" ? new Date(item.created) : null;
        uniqueListings.set(externalId, {
          externalId,
          title: title.slice(0, 240),
          company: company?.slice(0, 240) ?? null,
          location: location?.slice(0, 240) ?? null,
          category: rawCategory?.slice(0, 160) ?? null,
          listingUrl,
          postedAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
        });
      }
      if (!results.length || results.length < 50) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return { listings: Array.from(uniqueListings.values()), skipped };
};

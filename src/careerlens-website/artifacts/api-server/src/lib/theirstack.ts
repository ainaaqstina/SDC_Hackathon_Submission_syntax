import { ReplitConnectors } from "@replit/connectors-sdk";

export type TheirStackListing = {
  externalId: string;
  title: string;
  company: string | null;
  location: string | null;
  industry: string | null;
  listingUrl: string;
  postedAt: Date | null;
};

export class TheirStackApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "TheirStackApiError";
  }
}

const connectors = new ReplitConnectors();

export const normalizeTheirStackCountryCode = (value: string): string => {
  const countryCode = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new TheirStackApiError("Enter a two-letter ISO country code.", 400);
  }
  return countryCode;
};

const safeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return clean ? clean.slice(0, maxLength) : null;
};

const safeHttpUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const postedAtDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const fetchTheirStackListings = async (
  countryCodeInput: string,
  postedAtMaxAgeDays: number,
  limit: number,
): Promise<{ listings: TheirStackListing[]; skipped: number; creditsConsumed: number; providerTotalResults: number | null }> => {
  const countryCode = normalizeTheirStackCountryCode(countryCodeInput);
  const response = await connectors.proxy("theirstack", "/v1/jobs/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      posted_at_max_age_days: postedAtMaxAgeDays,
      job_country_code_or: [countryCode],
      limit,
      page: 0,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TheirStackApiError("TheirStack rejected the connected API authorization. Reconnect the integration and retry.", 502);
    }
    if (response.status === 402) {
      throw new TheirStackApiError("TheirStack has no API credits available for this search.", 503);
    }
    if (response.status === 422) {
      throw new TheirStackApiError("TheirStack rejected the country or search filters. Verify the country code and retry.", 400);
    }
    if (response.status === 429) {
      throw new TheirStackApiError("TheirStack rate limit reached. Wait before requesting another refresh.", 429);
    }
    throw new TheirStackApiError(`TheirStack returned HTTP ${response.status}. No unverified listings were imported.`, 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TheirStackApiError("TheirStack returned an unreadable response.", 502);
  }

  if (!payload || typeof payload !== "object" || !Array.isArray((payload as Record<string, unknown>).data)) {
    throw new TheirStackApiError("TheirStack returned an unexpected job-search response.", 502);
  }

  const responseObject = payload as { data: unknown[]; metadata?: Record<string, unknown> };
  const listings = new Map<string, TheirStackListing>();
  let skipped = 0;
  for (const raw of responseObject.data) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      skipped += 1;
      continue;
    }
    const item = raw as Record<string, unknown>;
    const externalId =
      typeof item.id === "string" || typeof item.id === "number" ? String(item.id).trim() : "";
    const title = safeText(item.job_title, 240);
    const listingUrl = safeHttpUrl(item.url) ?? safeHttpUrl(item.final_url);
    if (!externalId || !title || !listingUrl) {
      skipped += 1;
      continue;
    }
    const companyObject =
      item.company_object && typeof item.company_object === "object" && !Array.isArray(item.company_object)
        ? (item.company_object as Record<string, unknown>)
        : {};
    const company = safeText(companyObject.name ?? item.company, 240);
    const location = safeText(item.location ?? item.short_location, 240);
    const industry = safeText(companyObject.industry, 160);
    listings.set(externalId, {
      externalId,
      title,
      company,
      location,
      industry,
      listingUrl,
      postedAt: postedAtDate(item.date_posted),
    });
  }
  const totalResults = responseObject.metadata?.total_results;
  return {
    listings: Array.from(listings.values()),
    skipped,
    creditsConsumed: responseObject.data.length,
    providerTotalResults:
      typeof totalResults === "number" && Number.isSafeInteger(totalResults) && totalResults >= 0
        ? totalResults
        : null,
  };
};

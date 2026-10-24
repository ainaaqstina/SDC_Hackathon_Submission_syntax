import { inArray } from "drizzle-orm";
import { careerDataSourcesTable, db } from "@workspace/db";
import { logger } from "./logger";
import { normalizeAdzunaCountryCode } from "./adzuna";
import { refreshAdzunaMarket } from "./adzuna-refresh";

export const DEFAULT_ADZUNA_REFRESH_INTERVAL_HOURS = 24;
export const MIN_ADZUNA_REFRESH_INTERVAL_HOURS = 24;
export const MAX_ADZUNA_REFRESH_INTERVAL_HOURS = 24 * 30;

export const parseAdzunaRefreshIntervalHours = (value?: string): number => {
  if (value === undefined || value.trim() === "") return DEFAULT_ADZUNA_REFRESH_INTERVAL_HOURS;
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < MIN_ADZUNA_REFRESH_INTERVAL_HOURS ||
    parsed > MAX_ADZUNA_REFRESH_INTERVAL_HOURS
  ) {
    throw new Error(
      `ADZUNA_AUTO_REFRESH_INTERVAL_HOURS must be a whole number from ${MIN_ADZUNA_REFRESH_INTERVAL_HOURS} to ${MAX_ADZUNA_REFRESH_INTERVAL_HOURS}.`,
    );
  }
  return parsed;
};

export const parseAdzunaRefreshCountries = (value?: string): string[] => {
  const configured = value?.trim() || "SG";
  const countries = Array.from(
    new Set(configured.split(",").map((country) => normalizeAdzunaCountryCode(country).toUpperCase())),
  );
  if (!countries.length) throw new Error("Configure at least one approved Adzuna country.");
  return countries;
};

export const startAdzunaRefreshScheduler = (): void => {
  if (process.env.ADZUNA_USAGE_APPROVED?.trim().toLowerCase() !== "true") {
    logger.info("Adzuna scheduler is disabled because written permission is not enabled.");
    return;
  }
  if (!process.env.ADZUNA_APP_ID?.trim() || !process.env.ADZUNA_APP_KEY?.trim()) {
    logger.warn("Adzuna scheduler is disabled because API credentials are not configured.");
    return;
  }

  let intervalHours: number;
  let countries: string[];
  try {
    intervalHours = parseAdzunaRefreshIntervalHours(process.env.ADZUNA_AUTO_REFRESH_INTERVAL_HOURS);
    countries = parseAdzunaRefreshCountries(process.env.ADZUNA_AUTO_REFRESH_COUNTRIES);
  } catch (error) {
    logger.error({ err: error }, "Adzuna scheduler configuration is invalid; automatic refresh is disabled.");
    return;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  let cycleRunning = false;
  const runCycle = async (): Promise<void> => {
    if (cycleRunning) return;
    cycleRunning = true;
    try {
      const keys = countries.map((country) => `adzuna:${country.toLowerCase()}`);
      const sources = await db
        .select()
        .from(careerDataSourcesTable)
        .where(inArray(careerDataSourcesTable.key, keys));
      const sourcesByKey = new Map(sources.map((source) => [source.key, source]));

      // Only refresh markets with a successful, explicitly established snapshot.
      // This prevents an environment allowlist alone from silently enrolling a
      // new market in ongoing API use.
      for (const countryCode of countries) {
        const sourceKey = `adzuna:${countryCode.toLowerCase()}`;
        const source = sourcesByKey.get(sourceKey);
        if (!source?.lastSuccessAt) {
          logger.info({ countryCode }, "Adzuna scheduled refresh skipped; no prior successful snapshot exists.");
          continue;
        }
        const lastAttempt = source.lastAttemptAt?.getTime() ?? source.lastSuccessAt.getTime();
        if (Date.now() - lastAttempt < intervalMs) continue;

        try {
          const result = await refreshAdzunaMarket(countryCode, 1);
          logger.info(
            {
              countryCode,
              status: result.status,
              imported: result.imported,
              updated: result.updated,
              skipped: result.skipped,
            },
            "Scheduled Adzuna snapshot refresh completed.",
          );
        } catch (error) {
          if (error instanceof Error && error.message.includes("already running")) {
            logger.info({ countryCode }, "Scheduled Adzuna refresh skipped; a refresh is already running.");
            continue;
          }
          logger.error({ countryCode, err: error }, "Scheduled Adzuna snapshot refresh failed.");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Adzuna scheduler cycle failed.");
    } finally {
      cycleRunning = false;
    }
  };

  const tickMs = Math.min(intervalMs, 60 * 60 * 1000);
  const timer = setInterval(() => void runCycle(), tickMs);
  timer.unref();
  void runCycle();
  logger.info(
    { countries, intervalHours },
    "Adzuna scheduled refresh is active. Countries without a successful manual snapshot remain excluded.",
  );
};

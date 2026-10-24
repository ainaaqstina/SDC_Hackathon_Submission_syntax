import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADZUNA_REFRESH_INTERVAL_HOURS,
  MAX_ADZUNA_REFRESH_INTERVAL_HOURS,
  MIN_ADZUNA_REFRESH_INTERVAL_HOURS,
  parseAdzunaRefreshCountries,
  parseAdzunaRefreshIntervalHours,
} from "./adzuna-scheduler";

describe("Adzuna scheduled refresh configuration", () => {
  it("defaults to once daily and the Singapore market", () => {
    expect(parseAdzunaRefreshIntervalHours()).toBe(DEFAULT_ADZUNA_REFRESH_INTERVAL_HOURS);
    expect(parseAdzunaRefreshCountries()).toEqual(["SG"]);
  });

  it("accepts unique configured countries and intervals in the supported range", () => {
    expect(parseAdzunaRefreshCountries("sg, GB,SG")).toEqual(["SG", "GB"]);
    expect(parseAdzunaRefreshIntervalHours(String(MIN_ADZUNA_REFRESH_INTERVAL_HOURS))).toBe(
      MIN_ADZUNA_REFRESH_INTERVAL_HOURS,
    );
    expect(parseAdzunaRefreshIntervalHours(String(MAX_ADZUNA_REFRESH_INTERVAL_HOURS))).toBe(
      MAX_ADZUNA_REFRESH_INTERVAL_HOURS,
    );
  });

  it("rejects invalid or more frequent schedules and malformed market codes", () => {
    expect(() => parseAdzunaRefreshIntervalHours("23")).toThrow();
    expect(() => parseAdzunaRefreshIntervalHours("24.5")).toThrow();
    expect(() => parseAdzunaRefreshIntervalHours(String(MAX_ADZUNA_REFRESH_INTERVAL_HOURS + 1))).toThrow();
    expect(() => parseAdzunaRefreshCountries("Singapore")).toThrow();
  });
});

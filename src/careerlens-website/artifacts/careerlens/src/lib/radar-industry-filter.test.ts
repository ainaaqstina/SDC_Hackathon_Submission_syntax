import { describe, expect, it } from "vitest";
import {
  filterRadarSignalsByIndustry,
  isSharedRadarSignal,
  RADAR_INDUSTRIES,
  RADAR_INDUSTRY_OPTIONS,
} from "./radar-industry-filter";

const signals = [
  "AI literacy",
  "Data literacy",
  "Cybersecurity",
  "Technological literacy",
  "Creative thinking",
  "Resilience",
  "Data entry",
  "Routine administrative processing",
].map((skill) => ({
  skill,
  direction: "rising",
  score: 75,
  source: "Test source",
  observedAt: new Date("2025-01-01T00:00:00.000Z"),
  evidence: "Test evidence",
}));

describe("Future Skills Radar industry filter", () => {
  it("offers all available industry groups without job-title options", () => {
    expect(RADAR_INDUSTRY_OPTIONS).toHaveLength(RADAR_INDUSTRIES.length + 1);
    expect(RADAR_INDUSTRY_OPTIONS[0]).toEqual({ value: "all", label: "All industries" });
    expect(RADAR_INDUSTRY_OPTIONS.map(({ value }) => value)).toEqual([
      "all",
      ...RADAR_INDUSTRIES,
    ]);
  });

  it("keeps all source skills visible in the all-industries view", () => {
    expect(filterRadarSignalsByIndustry(signals, "all")).toEqual(signals);
  });

  it("filters to relevant skill signals for the selected industry", () => {
    const finance = filterRadarSignalsByIndustry(signals, "Finance and Accounting");
    expect(finance.map(({ skill }) => skill)).toEqual([
      "Cybersecurity",
      "Data entry",
      "Routine administrative processing",
    ]);
  });

  it("returns different topics for IT and finance", () => {
    const it = filterRadarSignalsByIndustry(signals, "Information Technology").map(({ skill }) => skill);
    expect(it).toEqual(["Cybersecurity", "Creative thinking"]);
    expect(it).not.toEqual(filterRadarSignalsByIndustry(signals, "Finance and Accounting").map(({ skill }) => skill));
  });

  it("includes cross-industry skills only when requested", () => {
    const result = filterRadarSignalsByIndustry(signals, "Finance and Accounting", { includeShared: true });
    expect(result).toHaveLength(7);
    expect(result.filter(({ skill }) => isSharedRadarSignal(skill))).toHaveLength(4);
  });

  it("returns an honest empty result when no industry topics are tagged", () => {
    expect(filterRadarSignalsByIndustry(signals, "Construction and Trades")).toEqual([]);
    expect(filterRadarSignalsByIndustry(signals, "Construction and Trades", { includeShared: true })).toHaveLength(4);
  });

  it("normalizes source whitespace and leaves unknown skills unassigned", () => {
    expect(filterRadarSignalsByIndustry([{ skill: "  Cybersecurity  " }, { skill: "Unknown skill" }], "Information Technology")).toEqual([{ skill: "  Cybersecurity  " }]);
    expect(filterRadarSignalsByIndustry([], "Healthcare and Nursing")).toEqual([]);
  });
});

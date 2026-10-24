import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-zod";
import { buildTrendSignals } from "./career-engine";

const profile = (primaryDomain: string): Profile => ({
  id: `radar-${primaryDomain.toLowerCase().replaceAll(/\W+/g, "-")}`,
  name: "Radar test profile",
  education: "",
  primaryDomain,
  secondaryDomains: [],
  skills: [],
  experience: [],
  interests: [],
  certifications: [],
  confirmed: true,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

describe("Future Skills Radar signal availability", () => {
  it("makes the complete dated skill set available regardless of the active profile sector", () => {
    const engineeringSignals = buildTrendSignals(profile("Engineering"));
    const financeSignals = buildTrendSignals(profile("Finance"));

    expect(engineeringSignals).toHaveLength(8);
    expect(engineeringSignals.map(({ skill }) => skill)).toEqual(
      financeSignals.map(({ skill }) => skill),
    );
    expect(engineeringSignals.every((signal) => signal.source.includes("Future of Jobs Report 2025"))).toBe(true);
  });
});

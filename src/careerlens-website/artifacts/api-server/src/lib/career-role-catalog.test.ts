import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-zod";
import { filterCandidatesToProfileSector } from "./career-sector";
import { getCareerRoleCatalog } from "./career-engine";

describe("Career Explorer role catalog", () => {
  const roles = getCareerRoleCatalog();
  const profileForDomain = (primaryDomain: string): Profile => ({
    id: "catalog-test",
    name: "Catalog test",
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

  it("contains at least 100 distinct, actionable career paths", () => {
    expect(roles.length).toBeGreaterThanOrEqual(100);
    expect(new Set(roles.map((role) => role.id)).size).toBe(roles.length);
    expect(roles.every((role) => role.requiredSkills.length >= 3)).toBe(true);
    expect(roles.every((role) => role.responsibilities.length >= 2)).toBe(true);
  });

  it("includes options in long-tail sectors as well as the original sectors", () => {
    const domains = new Set(roles.map((role) => role.domain));
    expect([...domains]).toEqual(expect.arrayContaining([
      "Healthcare and Nursing",
      "Agriculture and Food Production",
      "Public Safety and Security",
      "Real Estate and Property",
      "Insurance",
    ]));
  });

  it.each([
    ["Agronomy", "Agriculture and Food Production", "agronomist"],
    ["Insurance claims", "Insurance", "insurance-claims-adjuster"],
    ["Property management", "Real Estate and Property", "property-manager"],
    ["Emergency management", "Public Safety and Security", "emergency-management-specialist"],
  ])("filters %s profiles to their own catalog sector", (primaryDomain, expectedDomain, expectedRoleId) => {
    const matches = filterCandidatesToProfileSector(profileForDomain(primaryDomain), roles);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((role) => role.domain === expectedDomain)).toBe(true);
    expect(matches.some((role) => role.id === expectedRoleId)).toBe(true);
  });
});

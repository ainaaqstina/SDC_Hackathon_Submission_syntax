import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-zod";
import {
  filterCandidatesToProfileSector,
  inferProfileSector,
} from "./career-sector";

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "sector-test",
  name: "Test profile",
  education: "",
  fieldOfStudy: "",
  primaryDomain: "Other",
  secondaryDomains: [],
  skills: [],
  experience: [],
  interests: [],
  certifications: [],
  confirmed: true,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("career sector matching", () => {
  it("keeps healthcare recommendations together for a nursing profile", () => {
    const profile = makeProfile({ primaryDomain: "Healthcare and Nursing" });
    const candidates = [
      { id: "rn", title: "Registered Nurse", domain: "Healthcare and Nursing" },
      { id: "coordinator", title: "Nurse Care Coordinator", domain: "Healthcare and Nursing" },
      { id: "developer", title: "Software Developer", domain: "Information Technology" },
    ];

    expect(filterCandidatesToProfileSector(profile, candidates).map(({ id }) => id)).toEqual([
      "rn",
      "coordinator",
    ]);
  });

  it("infers a sector from CV work history when the primary domain is unspecified", () => {
    const profile = makeProfile({
      experience: [
        {
          title: "Registered Nurse",
          organization: "City Hospital",
          description: "Provided patient care and clinical documentation.",
        } as Profile["experience"][number],
      ],
    });

    expect(inferProfileSector(profile)?.key).toBe("healthcare");
  });

  it("supports matching imported occupations by an unlisted but explicit industry", () => {
    const profile = makeProfile({ primaryDomain: "Aviation" });
    const candidates = [
      { id: "pilot", title: "Commercial Pilot", industry: "Aviation" },
      { id: "accountant", title: "Accountant", industry: "Finance and Accounting" },
    ];

    expect(filterCandidatesToProfileSector(profile, candidates).map(({ id }) => id)).toEqual([
      "pilot",
    ]);
  });

  it.each([
    ["Agronomy", "agriculture"],
    ["Insurance claims", "insurance"],
    ["Property management", "real-estate"],
    ["Emergency management", "public-safety"],
  ])("recognizes the expanded %s sector", (primaryDomain, sectorKey) => {
    expect(inferProfileSector(makeProfile({ primaryDomain }))?.key).toBe(sectorKey);
  });

  it("returns no unrelated candidates when the profile has no sector evidence", () => {
    const profile = makeProfile();
    const candidates = [
      { id: "developer", title: "Software Developer", domain: "Information Technology" },
      { id: "nurse", title: "Registered Nurse", domain: "Healthcare and Nursing" },
    ];

    expect(filterCandidatesToProfileSector(profile, candidates)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-zod";
import { applyCareerLensSpecializations } from "./career-specializations";

const profile = (overrides: Partial<Profile>): Profile => ({
  id: "specialization-test", name: "Test Profile", education: "", primaryDomain: "",
  secondaryDomains: [], skills: [], experience: [], interests: [], certifications: [],
  confirmed: true, updatedAt: new Date("2026-01-01T00:00:00.000Z"), ...overrides,
});

const occupations = [
  { id: "occupation-1", title: "Web Developers", occupationCode: "15-1254.00" },
  { id: "occupation-2", title: "Software Developers", occupationCode: "15-1252.00" },
  { id: "occupation-3", title: "Acute Care Nurses", occupationCode: "29-1141.01" },
  { id: "occupation-4", title: "First-Line Supervisors of Production and Operating Workers", occupationCode: "51-1011.00" },
  { id: "occupation-5", title: "Receptionists and Information Clerks", occupationCode: "43-4171.00" },
].map((occupation) => ({ ...occupation, careerLensSpecializationBasedOn: null }));

describe("profile-specific CareerLens occupation labels", () => {
  it("uses specific developer labels only when the profile supports that specialization", () => {
    const result = applyCareerLensSpecializations(occupations, profile({
      primaryDomain: "Information Technology",
      skills: ["HTML", "CSS", "React", "JavaScript"].map((name) => ({
        name, category: "technology", level: "developing" as const, verified: false,
      })),
    }));
    expect(result.find((item) => item.title === "Frontend Developer")).toMatchObject({
      occupationCode: "15-1254.00", careerLensSpecializationBasedOn: "Web Developers",
    });
    expect(result.some((item) => item.title === "Software Developers")).toBe(true);
    expect(result.some((item) => item.title === "Bakery Production Supervisor")).toBe(false);

    const software = applyCareerLensSpecializations(occupations, profile({
      primaryDomain: "Software Engineering",
      interests: ["software development"],
    }));
    expect(software.find((item) => item.title === "Software Developer")?.careerLensSpecializationBasedOn)
      .toBe("Software Developers");

    const languageEvidence = applyCareerLensSpecializations(occupations, profile({
      primaryDomain: "Information Technology",
      skills: ["Python", "Java"].map((name) => ({
        name, category: "technology", level: "developing" as const, verified: false,
      })),
    }));
    expect(languageEvidence.find((item) => item.title === "Software Developer")?.occupationCode).toBe("15-1252.00");
  });

  it("adds healthcare, bakery, and reception specializations from matching profile evidence", () => {
    const result = applyCareerLensSpecializations(occupations, profile({
      primaryDomain: "Healthcare and Nursing",
      skills: [{ name: "Medical-surgical nursing", category: "healthcare", level: "developing", verified: false }],
      interests: ["nursing"],
    }));
    expect(result.find((item) => item.title === "Medical-Surgical Registered Nurse")?.careerLensSpecializationBasedOn)
      .toBe("Acute Care Nurses");

    const bakery = applyCareerLensSpecializations(occupations, profile({ primaryDomain: "Bakery Production" }));
    expect(bakery.find((item) => item.title === "Bakery Production Supervisor")?.occupationCode).toBe("51-1011.00");

    const reception = applyCareerLensSpecializations(occupations, profile({ experience: [
      { title: "Receptionist", organization: "Office", description: "" },
    ] }));
    expect(reception.find((item) => item.title === "Receptionist")?.occupationCode).toBe("43-4171.00");
  });

  it("preserves the full source title when a specific display label is not supported", () => {
    const result = applyCareerLensSpecializations(occupations, profile({ primaryDomain: "Education" }));
    expect(result).toEqual(occupations);
  });
});

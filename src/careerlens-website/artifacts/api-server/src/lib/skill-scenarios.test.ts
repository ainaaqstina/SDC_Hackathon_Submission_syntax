import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-zod";
import { assessSkillGaps, canonicalSkillName, hasSkill } from "./skill-matching";
import { buildRoadmap, calculateMatches } from "./career-engine";
import { learningResourcesFor } from "./learning-resources";
import { parseJsonContent } from "./runpod";

const profile = (skills: string[]): Profile => ({
  id: "synthetic-qa", name: "Synthetic Candidate", education: "", primaryDomain: "Information Technology",
  secondaryDomains: [], skills: skills.map((name) => ({ name, category: "Technical", level: "developing", verified: false })),
  experience: [], interests: [], confirmed: true, updatedAt: new Date(),
});
const role = {
  id: "synthetic-role", title: "Synthetic developer", domain: "Information Technology",
  required: ["Python", "SQL", "React"], interests: [], tasks: [], sdgs: [],
};

describe("TC09–31 deterministic skill and learning safeguards", () => {
  it("TC12/23 normalizes JS and casing without confusing Java with JavaScript", () => {
    expect(canonicalSkillName("JS")).toBe("JavaScript");
    expect(hasSkill(["javascript"], "JavaScript")).toBe(true);
    expect(hasSkill(["JS"], "JavaScript")).toBe(true);
    expect(hasSkill(["JavaScript"], "Java")).toBe(false);
    expect(hasSkill([""], "React")).toBe(false);
  });
  it("TC21 identifies React as the only missing skill", () => {
    expect(assessSkillGaps(["Python", "SQL"], role.required).missing).toEqual(["React"]);
    expect(buildRoadmap(profile(["Python", "SQL"]), role).steps.map((step) => step.skill)).toEqual(["React"]);
  });
  it("TC22 returns no gaps when all requirements are present", () => {
    expect(assessSkillGaps(role.required, role.required).missing).toEqual([]);
    expect(buildRoadmap(profile(role.required), role).steps).toEqual([]);
  });
  it("TC25 handles an empty skills array", () => {
    expect(assessSkillGaps([], role.required).missing).toEqual(role.required);
    expect(buildRoadmap(profile([]), role).steps).toHaveLength(3);
  });
  it("TC26 marks missing requirements as insufficient information", () => {
    expect(assessSkillGaps(["Python"], [])).toEqual({ insufficientInformation: true, matched: [], missing: [] });
  });
  it("TC17 produces low alignment and explicit gaps for no matching skills", () => {
    const results = calculateMatches(profile([]), "moderate", undefined, []);
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((match) => match.skillsScore === 0 && match.score < 50 && match.missingSkills.length > 0)).toBe(true);
  });
  it("TC18 keeps multiple relevant directions available", () => {
    const results = calculateMatches(profile(["Python", "SQL", "JavaScript", "Data analysis"]), "moderate", undefined, []);
    expect(results.filter((match) => match.matchedSkills.length > 0).length).toBeGreaterThan(1);
  });
  it("TC27/28/29 provides relevant React learning and certificate choices, free first", () => {
    const resources = learningResourcesFor("React");
    expect(resources[0]).toMatchObject({ url: "https://react.dev/learn", access: "free", kind: "learning" });
    expect(resources.some((item) => item.kind === "certificate")).toBe(true);
    const [search] = learningResourcesFor("unknown specialist skill");
    expect(search.title).toBe("Find online courses for unknown specialist skill");
    expect(new URL(search.url).pathname).toBe("/search");
    expect(new URL(search.url).searchParams.get("query")).toBe("unknown specialist skill");
  });
  it("TC30 only supplies HTTPS provider URLs with no embedded credentials", () => {
    for (const skill of ["React", "JS", "Python", "Java", "SQL", "Data visualization"]) {
      for (const resource of learningResourcesFor(skill)) {
        const url = new URL(resource.url);
        expect(url.protocol).toBe("https:");
        expect(url.username).toBe("");
        expect(new URL(resource.providerUrl!).protocol).toBe("https:");
      }
    }
  });
  it("TC31 does not silently drop skills after five gaps", () => {
    const required = ["Python", "SQL", "React", "Java", "JavaScript", "Git"];
    expect(buildRoadmap(profile([]), { ...role, required }).steps).toHaveLength(required.length);
  });
});

describe("TC38 invalid provider output", () => {
  it.each(["not JSON", '{"skills":', "", "[]"])("rejects invalid JSON safely: %s", (content) => {
    expect(() => parseJsonContent(content)).toThrow(/not valid JSON/);
  });
  it("accepts a fenced JSON object after optional reasoning", () => {
    expect(parseJsonContent('<think>discard this</think>```json\n{"skills":[]}\n```')).toEqual({ skills: [] });
  });
});

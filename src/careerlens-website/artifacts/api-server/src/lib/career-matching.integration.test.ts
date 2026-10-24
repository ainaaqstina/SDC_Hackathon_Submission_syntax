import { describe, expect, it } from "vitest";

// Explicit opt-in: requires the running preview, imported O*NET data and RunPod.
// It reads a demonstration profile, but never saves a profile or a roadmap.
describe.skipIf(process.env.RUN_CAREER_SOURCE_SMOKE !== "1")("live O*NET/RunPod regression smoke", () => {
  it("keeps a six-skill IT profile's specific occupations, target gaps and SDGs consistent", async () => {
    const response = await fetch("http://localhost:80/api/career/profiles/demo-it");
    expect(response.ok).toBe(true);
    const { getCareerMatches, getCareerRoadmapTarget } = await import("./career-matching");
    const profile = await response.json() as Parameters<typeof getCareerMatches>[0];
    profile.skills = ["Python", "JavaScript", "HTML", "CSS", "SQL", "problem-solving"].map((name) => ({
      ...profile.skills[0], name, level: "developing",
    }));
    profile.interests = ["software development", "web development"];
    const { db } = await import("@workspace/db");
    try {
      const matches = await getCareerMatches(profile);
      for (const code of ["15-1251.00", "15-1252.00", "15-1253.00", "15-1254.00"]) {
        expect(matches.some((match) => match.occupationCode === code)).toBe(true);
      }
      expect(matches.every((match) => match.dataClassification === "source_backed")).toBe(true);
      const web = matches.find((match) => match.occupationCode === "15-1254.00");
      expect(web?.title).toBe("Frontend Developer");
      expect(web?.careerLensSpecializationBasedOn).toBe("Web Developers");
      if (!web) throw new Error("Expected specific Web Developers occupation was absent.");
      expect(web.matchedSkills).toEqual(expect.arrayContaining(["Python", "JavaScript", "HTML", "CSS", "SQL", "Complex Problem Solving"]));
      const target = await getCareerRoadmapTarget(profile, web.id);
      expect(target?.role.id).toBe(web.id);
      expect(target?.role.title).toBe(web.title);
      expect(target?.missingSkills).toEqual(web.missingSkills);
      expect(target?.role.sdgs).toEqual(web.sdgs);
      expect(web.sdgs.map((sdg) => sdg.number)).toEqual([8, 9]);
    } finally {
      await db.$client.end();
    }
  }, 120_000);
});

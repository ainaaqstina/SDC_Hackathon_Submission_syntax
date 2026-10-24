import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { softwareSkillAliases } from "./skill-matching";
import { sdgsForOnetCode } from "./onet-sdg";

const script = fileURLToPath(new URL("./career-matcher.py", import.meta.url));
const match = (payload: Record<string, unknown>) =>
  JSON.parse(execFileSync("python3", [script], { input: JSON.stringify(payload), encoding: "utf8" }));
const role = (id: string, industry: string, requiredSkills = ["Programming"]) => ({
  id, title: `Role ${id}`, industry, requiredSkills, dataClassification: "source_backed",
});

describe("source-aware career matching", () => {
  it("maps language evidence to a broader category without duplicating it", () => {
    const result = match({
      profile: { skills: ["Python", "Java", "JS"] },
      occupations: [role("it", "Computer and Mathematical Occupations")],
    });
    expect(result[0].matchedSkills).toEqual(["Programming"]);
    expect(result[0].missingSkills).toEqual([]);
  });

  it("does not pad unsupported source data with arbitrary roles", () => {
    expect(match({
      profile: { skills: ["Unrelated hobby"] },
      occupations: [role("it", "Computer and Mathematical Occupations")],
    })).toEqual([]);
  });

  it("analyzes an explicit target even when no skills match", () => {
    const result = match({
      profile: { skills: [] }, targetCareerId: "it",
      occupations: [role("it", "Computer and Mathematical Occupations")],
    });
    expect(result[0].score).toBe(0);
    expect(result[0].missingSkills).toEqual(["Programming"]);
  });

  it("returns up to 40 supported options without forcing unrelated-family variety", () => {
    const result = match({
      profile: { skills: ["Python"] },
      occupations: Array.from({ length: 50 }, (_, i) => role(String(i), `Family ${Math.floor(i / 3)}`)),
    });
    expect(result).toHaveLength(40);
    expect(result.every((item: { score: number }) => item.score === 100)).toBe(true);
    expect(new Set(result.map((item: { industry: string }) => item.industry)).size).toBeGreaterThan(1);
  });

  it("uses domain evidence as a tie-break, not a hard sector filter", () => {
    const result = match({
      profile: { skills: ["Programming"], primaryDomain: "Healthcare" },
      occupations: [
        role("a", "Computer and Mathematical Occupations"),
        role("b", "Healthcare Practitioners and Technical Occupations"),
      ],
    });
    expect(result.map((item: { id: string }) => item.id)).toEqual(["b", "a"]);
    expect(result[0].score).toBe(result[1].score);
  });

  it("does not invent requirements for a target with no skill information", () => {
    const result = match({
      profile: { skills: ["Python"] }, targetCareerId: "empty",
      occupations: [role("empty", "Unknown", [])],
    });
    expect(result[0].score).toBe(0);
    expect(result[0].missingSkills).toEqual([]);
  });

  it("does not infer broad engineering skills from research terms or a design tool", () => {
    const result = match({
      profile: { skills: ["Figma", "User research", "Research synthesis"], primaryDomain: "User Experience Research" },
      occupations: [
        { ...role("engineering", "Architecture and Engineering Occupations", ["Systems Analysis"]), title: "Electrical Engineers", responsibilities: ["Research electrical equipment."] },
        { ...role("research", "Business and Financial Operations Occupations", ["Systems Analysis"]), title: "Market Research Analysts" },
      ],
    });
    expect(result[0].id).toBe("research");
    expect(result.every((item: { matchedSkills: string[] }) => item.matchedSkills.length === 0)).toBe(true);
    expect(result[0].score).toBe(0);
  });

  const itProfile = {
    primaryDomain: "Information Technology", fieldOfStudy: "Computer Science",
    skills: ["Python", "JS", "HTML", "CSS", "SQL", "problem-solving"],
    interests: ["web development"],
  };
  const web = {
    ...role("occupation-101", "Computer and Mathematical Occupations", ["Programming", "Complex Problem Solving", "Coordination"]),
    title: "Web Developers", occupationCode: "15-1254.00",
    skillImportance: { Programming: 4, "Complex Problem Solving": 4, Coordination: 2 },
    softwareSkills: ["Python", "JavaScript", "Hypertext markup language HTML", "Cascading style sheets CSS", "Structured query language SQL"],
    responsibilities: ["Develop and implement websites."],
    sdgs: sdgsForOnetCode("15-1254.00"),
  };
  const unrelated = {
    ...role("occupation-102", "Architecture and Engineering Occupations", ["Systems Analysis"]),
    title: "Mechanical Engineers", softwareSkills: ["CAD"],
  };

  it("recognizes the sample IT profile's specific software evidence and explains the exact weights", () => {
    const [result] = match({ profile: itProfile, occupations: [unrelated, web], skillAliases: softwareSkillAliases });
    expect(result.id).toBe("occupation-101");
    expect(result.title).toBe("Web Developers");
    expect(result.occupationCode).toBe("15-1254.00");
    expect(result.softwareScore).toBe(100);
    expect(result.transferableSkillsScore).toBe(80);
    expect(result.skillsScore).toBe(94);
    expect(result.interestScore).toBe(100);
    expect(result.score).toBe(95);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["Python", "JS", "HTML", "CSS", "SQL", "Programming", "Complex Problem Solving"]));
    expect(result.missingSkills).toEqual(["Coordination"]);
    expect(result.scoringNote).toContain("70% software relevance");
    expect(result.scoringNote).toContain("85% skills + 15%");
    expect(result.sdgs.map((sdg: { number: number }) => sdg.number)).toEqual([8, 9]);
  });

  it("uses identical evidence, scores, missing skills and identifiers for discovery and explicit targets", () => {
    const occupations = [unrelated, web];
    const common = { profile: itProfile, skillAliases: softwareSkillAliases };
    const [discovery] = match({ ...common, occupations });
    const [target] = match({
      ...common, occupations: [web], targetCareerId: web.id,
      softwareCatalog: occupations.map((occupation) => occupation.softwareSkills),
    });
    expect(target).toEqual(discovery);
  });

  it("does not infer programming competence from HTML and CSS, or mark every software example missing", () => {
    const [result] = match({
      profile: { skills: ["HTML", "CSS"] }, occupations: [web],
      skillAliases: softwareSkillAliases, targetCareerId: web.id,
    });
    expect(result.matchedSkills).toEqual(["CSS", "HTML"]);
    expect(result.missingSkills).toEqual(["Programming", "Complex Problem Solving", "Coordination"]);
    expect(result.missingSkills).not.toContain("Python");
    expect(result.scoringNote).toContain("Software examples are not universal requirements");
  });

  it("does not let ubiquitous office software alone give every occupation a high score", () => {
    const occupations = Array.from({ length: 25 }, (_, i) => ({
      ...role(`office-${i}`, "Some family"), softwareSkills: ["Microsoft Excel"],
    }));
    const [result] = match({
      profile: { skills: ["Excel"] }, occupations, targetCareerId: "office-0",
      skillAliases: softwareSkillAliases,
    });
    expect(result.score).toBe(0);
    expect(result.softwareScore).toBeNull();
  });

  it("distinguishes snapshot in-demand examples from weaker listed associations without claiming live demand", () => {
    const [result] = match({
      profile: { skills: ["Python", "SQL"] }, targetCareerId: web.id, skillAliases: softwareSkillAliases,
      occupations: [{ ...web, softwareSkills: [{ name: "Python", inDemand: true }, { name: "Structured query language SQL", inDemand: false }] }],
    });
    expect(result.softwareScore).toBe(75);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["Python", "SQL"]));
    expect(result.scoringNote).toContain("other listed examples receive half weight");
    expect(result.scoringNote).toContain("not live or local demand");
  });

  it("keeps better-supported specific occupations ahead of weaker roles in other families", () => {
    const occupations = [
      ...Array.from({ length: 5 }, (_, i) => role(`it-${i}`, "Computer and Mathematical Occupations")),
      ...Array.from({ length: 12 }, (_, i) => role(`other-${i}`, `Family ${i}`, ["Programming", "Unmatched"])),
    ];
    const results = match({ profile: { skills: ["Programming"] }, occupations });
    expect(results.slice(0, 5).every((item: { id: string }) => item.id.startsWith("it-"))).toBe(true);
    expect(results.some((item: { id: string }) => item.id.startsWith("other-"))).toBe(true);
  });

  it("deduplicates synonymous requirements and distinguishes C from C++", () => {
    const [result] = match({
      profile: { skills: ["JS", "C++"] },
      occupations: [role("target", "IT", ["JavaScript", "JS", "SQL", "C"])],
      targetCareerId: "target", skillAliases: softwareSkillAliases,
    });
    expect(result.matchedSkills).toHaveLength(1);
    expect(result.missingSkills).toEqual(["SQL", "C"]);
    expect(result.skillsScore).toBe(33);
  });

  it("does not award skill points for a domain name or invent absent source categories", () => {
    const [result] = match({
      profile: { skills: [], primaryDomain: "Information Technology" },
      occupations: [{ ...web, requiredSkills: [], skillImportance: {} }],
      targetCareerId: web.id,
    });
    expect(result.score).toBe(0);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual([]);
    expect(result.scoringNote).toContain("No missing occupational categories are inferred");
  });
});

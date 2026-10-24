import { describe, expect, it } from "vitest";
import { wef2025OccupationTrendsCsv, wef2025SkillRankingsCsv } from "./wef-2025-data";
import { parseWorkforceDataset } from "./workforce-context";

describe("WEF 2025 workforce snapshot import", () => {
  it("preserves ranked skills, source fields, raw rows, and blank metrics", () => {
    const skills = parseWorkforceDataset("skills", wef2025SkillRankingsCsv, 12);
    expect(skills).toHaveLength(26);
    expect(skills[0]).toMatchObject({
      datasetKey: "wef-2025-skills", externalId: "WEFS01", recordType: "skill_rank",
      rank: 1, trendGroup: "fastest_growing_top_10", industryTagsOfficial: false,
      observationYear: 2025, forecastEndYear: 2030, sourceFigure: "Figure 3.4",
      sourceUrl: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook",
      dataType: "wef_report_rank_plus_careerlens_industry_mapping",
      numericSkillScore: null, projectedGrowthPercent: null, aiReplacementProbability: null,
    });
    expect(skills[0].rawRecord.skill_id).toBe("WEFS01");
    expect(skills.every((skill) => typeof skill.rank === "number" && skill.rank >= 1 && skill.rank <= 26)).toBe(true);
    expect(skills.every((skill) => skill.numericSkillScore === null)).toBe(true);
  });

  it("preserves qualitative occupation directions without filling missing projections", () => {
    const occupations = parseWorkforceDataset("occupations", wef2025OccupationTrendsCsv, 13);
    expect(occupations).toHaveLength(16);
    expect(occupations.filter((item) => item.direction === "growing")).toHaveLength(9);
    expect(occupations.filter((item) => item.direction === "declining")).toHaveLength(7);
    expect(occupations.every((item) => item.industryTagsOfficial === false)).toBe(true);
    expect(occupations.every((item) => item.observationYear === null)).toBe(true);
    expect(occupations.every((item) => item.projectedGrowthPercent === null)).toBe(true);
    expect(occupations.every((item) => item.aiReplacementProbability === null)).toBe(true);
    expect(occupations[0]).toMatchObject({
      sourceUrl: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/2-jobs-outlook",
      dataType: "wef_report_direction_plus_careerlens_industry_mapping",
    });
  });

  it("rejects a CSV that omits a required source/provenance column", () => {
    expect(() => parseWorkforceDataset("skills", wef2025SkillRankingsCsv.replace("source_url", "url_missing"), 1))
      .toThrow(/missing the required column/);
  });
});

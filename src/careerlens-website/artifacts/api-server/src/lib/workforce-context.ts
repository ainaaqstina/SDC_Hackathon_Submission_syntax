import { asc, count, eq, sql } from "drizzle-orm";
import { careerDataSourcesTable, careerWorkforceRecordsTable, db, type CareerWorkforceRecord } from "@workspace/db";
import { parseCsv } from "./career-data-imports";
import { wef2025OccupationTrendsCsv, wef2025SkillRankingsCsv } from "./wef-2025-data";

export type WorkforceKind = "skills" | "occupations";
type DatasetAdapter = {
  key: string; name: string; kind: WorkforceKind; csv: string;
  required: string[]; nameField: string; idField?: string;
  sourceField: string; publicationPeriod: string;
};
const datasets: DatasetAdapter[] = [
  {
    key: "wef-2025-skills", name: "WEF Future of Jobs Report 2025 · Skills Outlook",
    kind: "skills", csv: wef2025SkillRankingsCsv,
    required: ["skill_id", "skill_name", "rank_by_net_increase_2025_2030", "trend_group",
      "industry_tags_careerlens_inferred", "industry_tags_are_official_wef", "wef_numeric_skill_score",
      "observation_year", "forecast_end_year", "source_figure", "source_url", "data_type"],
    nameField: "skill_name", idField: "skill_id", sourceField: "source_url",
    publicationPeriod: "Skill observation year 2025; reported rank window 2025–2030",
  },
  {
    key: "wef-2025-occupations", name: "WEF Future of Jobs Report 2025 · Jobs Outlook",
    kind: "occupations", csv: wef2025OccupationTrendsCsv,
    required: ["job_title", "reported_direction", "industry_tag_careerlens_inferred",
      "industry_tag_is_official_wef", "exact_projected_growth_percent", "ai_replacement_probability",
      "forecast_end_year", "source_url", "data_type"],
    nameField: "job_title", sourceField: "source_url",
    publicationPeriod: "Job-direction report through 2030",
  },
];
const cleanHeader = (value: string) =>
  value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const cell = (record: Record<string, string>, key: string) => (record[key] ?? "").trim();
const optionalNumber = (value: string, field: string, line: number): number | null => {
  if (!value.trim()) return null;
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`Invalid ${field} on CSV row ${line}.`);
  return result;
};
const requiredNumber = (value: string, field: string, line: number): number => {
  const result = optionalNumber(value, field, line);
  if (result == null || !Number.isInteger(result)) throw new Error(`Missing or invalid ${field} on CSV row ${line}.`);
  return result;
};
const officialFlag = (value: string, line: number): boolean => {
  if (/^(no|false|0)$/i.test(value.trim())) return false;
  if (/^(yes|true|1)$/i.test(value.trim())) return true;
  throw new Error(`Missing or invalid industry-source flag on CSV row ${line}.`);
};
const positiveHttpsUrl = (value: string, line: number) => {
  try {
    if (new URL(value).protocol !== "https:") throw new Error();
    return value;
  } catch {
    throw new Error(`A valid HTTPS source URL is required on CSV row ${line}.`);
  }
};
const stableKey = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);

export type ParsedWorkforceRow = typeof careerWorkforceRecordsTable.$inferInsert;

/** Each dataset adapter preserves the original CSV row and its source metadata. */
export const parseWorkforceDataset = (
  kind: WorkforceKind,
  csv: string,
  sourceId: number,
): ParsedWorkforceRow[] => {
  const adapter = datasets.find((entry) => entry.kind === kind);
  if (!adapter) throw new Error("No parser is registered for this workforce-data type.");
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("The workforce dataset needs a CSV header and at least one record.");
  const header = rows[0].map(cleanHeader);
  if (new Set(header).size !== header.length) throw new Error("The workforce CSV contains duplicate column names.");
  for (const key of adapter.required) {
    if (!header.includes(key)) throw new Error(`The ${kind} CSV is missing the required column “${key}”.`);
  }
  return rows.slice(1).map((cells, index) => {
    const line = index + 2;
    const rawRecord = Object.fromEntries(header.map((key, col) => [key, cells[col] ?? ""]));
    const name = cell(rawRecord, adapter.nameField);
    if (!name || cells.length !== header.length) throw new Error(`The workforce CSV has a missing name or inconsistent column count on row ${line}.`);
    const recordId = adapter.idField ? cell(rawRecord, adapter.idField) : stableKey(name);
    if (!recordId) throw new Error(`The workforce CSV has an empty record ID on row ${line}.`);
    const sourceUrl = positiveHttpsUrl(cell(rawRecord, adapter.sourceField), line);
    const industryField = kind === "skills" ? "industry_tags_careerlens_inferred" : "industry_tag_careerlens_inferred";
    const officialField = kind === "skills" ? "industry_tags_are_official_wef" : "industry_tag_is_official_wef";
    const recordType = kind === "skills" ? "skill_rank" : "occupation_direction";
    const official = officialFlag(cell(rawRecord, officialField), line);

    return {
      datasetKey: adapter.key, externalId: recordId, sourceId,
      recordType, name,
      direction: kind === "occupations" ? cell(rawRecord, "reported_direction") || null : null,
      rank: kind === "skills" ? requiredNumber(cell(rawRecord, "rank_by_net_increase_2025_2030"), "rank", line) : null,
      trendGroup: kind === "skills" ? cell(rawRecord, "trend_group") || null : null,
      industryTags: cell(rawRecord, industryField).split("|").map((tag) => tag.trim()).filter(Boolean),
      industryTagsOfficial: official,
      numericSkillScore: kind === "skills" ? optionalNumber(cell(rawRecord, "wef_numeric_skill_score"), "WEF numeric skill score", line) : null,
      observationYear: header.includes("observation_year") ? optionalNumber(cell(rawRecord, "observation_year"), "observation year", line) : null,
      forecastEndYear: requiredNumber(cell(rawRecord, "forecast_end_year"), "forecast end year", line),
      sourceFigure: header.includes("source_figure") ? cell(rawRecord, "source_figure") || null : null,
      sourceUrl, dataType: cell(rawRecord, "data_type"),
      projectedGrowthPercent: header.includes("exact_projected_growth_percent")
        ? optionalNumber(cell(rawRecord, "exact_projected_growth_percent"), "projected growth", line) : null,
      aiReplacementProbability: header.includes("ai_replacement_probability")
        ? optionalNumber(cell(rawRecord, "ai_replacement_probability"), "AI replacement probability", line) : null,
      rawRecord,
    };
  });
};

let snapshotImport: Promise<void> | undefined;

/** Seed only these bundled, user-provided WEF snapshots; never truncate other imports. */
export const ensureWef2025SnapshotImported = (): Promise<void> => {
  snapshotImport ??= db.transaction(async (tx) => {
    for (const dataset of datasets) {
      const [existingSource] = await tx.select().from(careerDataSourcesTable)
        .where(eq(careerDataSourcesTable.key, dataset.key)).limit(1);
      const sourceMetadata = {
        adapter: dataset.kind, bundleVersion: "wef-2025-upload-v1",
        dataType: dataset.kind === "skills"
          ? "wef_report_rank_plus_careerlens_industry_mapping"
          : "wef_report_direction_plus_careerlens_industry_mapping",
        officialWefIndustryForecast: false,
      };
      const [source] = await tx.insert(careerDataSourcesTable).values({
        key: dataset.key, name: dataset.name, kind: "workforce_context", status: "active",
        sourceUrl: dataset.kind === "skills"
          ? "https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook"
          : "https://www.weforum.org/publications/the-future-of-jobs-report-2025/2-jobs-outlook",
        license: null, publicationPeriod: dataset.publicationPeriod, metadata: sourceMetadata,
      }).onConflictDoUpdate({
        target: careerDataSourcesTable.key,
        set: {
          name: dataset.name, kind: "workforce_context", status: "active",
          sourceUrl: dataset.kind === "skills"
            ? "https://www.weforum.org/publications/the-future-of-jobs-report-2025/3-skills-outlook"
            : "https://www.weforum.org/publications/the-future-of-jobs-report-2025/2-jobs-outlook",
          publicationPeriod: dataset.publicationPeriod, metadata: sourceMetadata, updatedAt: new Date(),
        },
      }).returning();
      const [result] = await tx.select({ total: count() }).from(careerWorkforceRecordsTable)
        .where(eq(careerWorkforceRecordsTable.datasetKey, dataset.key));
      const input = existingSource?.metadata?.bundleVersion === "wef-2025-upload-v1"
        && Number(result?.total) === parseCsv(dataset.csv).length - 1
        ? [] : parseWorkforceDataset(dataset.kind, dataset.csv, source.id);
      if (input.length) {
        await tx.insert(careerWorkforceRecordsTable).values(input).onConflictDoUpdate({
          target: [careerWorkforceRecordsTable.datasetKey, careerWorkforceRecordsTable.externalId],
          set: {
            sourceId: source.id, name: sql`excluded.name`,
            direction: sql`excluded.direction`, rank: sql`excluded.rank`,
            trendGroup: sql`excluded.trend_group`, industryTags: sql`excluded.industry_tags`,
            industryTagsOfficial: sql`excluded.industry_tags_official`, numericSkillScore: sql`excluded.numeric_skill_score`,
            observationYear: sql`excluded.observation_year`, forecastEndYear: sql`excluded.forecast_end_year`,
            sourceFigure: sql`excluded.source_figure`, sourceUrl: sql`excluded.source_url`,
            dataType: sql`excluded.data_type`, projectedGrowthPercent: sql`excluded.projected_growth_percent`,
            aiReplacementProbability: sql`excluded.ai_replacement_probability`, rawRecord: sql`excluded.raw_record`,
          },
        });
      }
    }
  }).catch((error) => {
    snapshotImport = undefined;
    throw error;
  });
  return snapshotImport;
};

/** Read only the imported snapshots and their full, row-specific provenance. */
export const getWef2025WorkforceContext = async () => {
  await ensureWef2025SnapshotImported();
  const [rows, sources] = await Promise.all([
    db.select().from(careerWorkforceRecordsTable).orderBy(asc(careerWorkforceRecordsTable.id)),
    db.select().from(careerDataSourcesTable).where(eq(careerDataSourcesTable.kind, "workforce_context"))
      .orderBy(asc(careerDataSourcesTable.key)),
  ]);
  const toApiRecord = (row: CareerWorkforceRecord) => ({
    externalId: row.externalId, recordType: row.recordType, name: row.name,
    direction: row.direction, rank: row.rank, trendGroup: row.trendGroup,
    industryTags: row.industryTags, industryTagsOfficial: row.industryTagsOfficial,
    numericSkillScore: row.numericSkillScore, observationYear: row.observationYear,
    forecastEndYear: row.forecastEndYear, sourceFigure: row.sourceFigure,
    sourceUrl: row.sourceUrl, dataType: row.dataType,
    projectedGrowthPercent: row.projectedGrowthPercent,
    aiReplacementProbability: row.aiReplacementProbability, rawRecord: row.rawRecord,
  });
  const skills = rows.filter((row) => row.recordType === "skill_rank").sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  const occupations = rows.filter((row) => row.recordType === "occupation_direction");
  return {
    skills: skills.map(toApiRecord),
    occupations: occupations.map(toApiRecord),
    sources: sources.map((source) => ({
      key: source.key, name: source.name, sourceUrl: source.sourceUrl ?? "",
      publicationPeriod: source.publicationPeriod ?? "Not stated in the supplied file",
      dataType: typeof source.metadata.dataType === "string" ? source.metadata.dataType : "Source record",
      recordCount: rows.filter((row) => row.datasetKey === source.key).length,
      officialWefIndustryForecast: source.metadata.officialWefIndustryForecast === true,
    })),
  };
};

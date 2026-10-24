import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  GetCareerDataAdminStatusResponse,
  ImportGoogleTrendsBody,
  ImportGoogleTrendsResponse,
  ImportOccupationDatasetBody,
  ImportOccupationDatasetResponse,
  RefreshAdzunaDataBody,
  RefreshTheirStackDataBody,
  RefreshTheirStackDataResponse,
  RefreshOnetOccupationDataResponse,
} from "@workspace/api-zod";
import {
  careerDataSourcesTable,
  careerImportRunsTable,
  careerJobAdsTable,
  careerOccupationSkillsTable,
  careerOccupationsTable,
  careerSkillsTable,
  careerTrendObservationsTable,
  careerWorkforceRecordsTable,
  db,
} from "@workspace/db";
import {
  classifyInterestDirection,
  normalizedSkillKey,
  parseGoogleTrendsCsv,
  parseOccupationImport,
} from "../lib/career-data-imports";
import { AdzunaApiError } from "../lib/adzuna";
import { refreshAdzunaMarket } from "../lib/adzuna-refresh";
import {
  fetchTheirStackListings,
  normalizeTheirStackCountryCode,
  TheirStackApiError,
} from "../lib/theirstack";
import { requireCareerDataAdmin } from "../lib/career-data-admin-auth";
import {
  fetchAndParseOnet31,
  ONET_LICENSE_NOTICE,
  ONET_LICENSE_URL,
  ONET_PUBLICATION_PERIOD,
  ONET_RELEASE,
  ONET_SOURCE_URL,
  SOC_TAXONOMY_URL,
} from "../lib/onet";

const router: IRouter = Router();
const activeTheirStackRefreshes = new Set<string>();
let activeOnetRefresh = false;

const slug = (value: string): string =>
  normalizedSkillKey(value).replace(/\s+/g, "-").slice(0, 100) || "unnamed";

const ensureSource = async (input: {
  key: string;
  name: string;
  kind: string;
  status: string;
  sourceUrl?: string | null;
  license?: string | null;
  countryCode?: string | null;
  region?: string | null;
  publicationPeriod?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const [source] = await db
    .insert(careerDataSourcesTable)
    .values({
      key: input.key,
      name: input.name,
      kind: input.kind,
      status: input.status,
      sourceUrl: input.sourceUrl ?? null,
      license: input.license ?? null,
      countryCode: input.countryCode ?? null,
      region: input.region ?? null,
      publicationPeriod: input.publicationPeriod ?? null,
      metadata: input.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: careerDataSourcesTable.key,
      set: {
        name: input.name,
        kind: input.kind,
        status: input.status,
        sourceUrl: input.sourceUrl ?? null,
        license: input.license ?? null,
        countryCode: input.countryCode ?? null,
        region: input.region ?? null,
        publicationPeriod: input.publicationPeriod ?? null,
        metadata: input.metadata ?? {},
        updatedAt: new Date(),
      },
    })
    .returning();
  return source;
};

const createImportRun = async (sourceId: number, sourceKey: string, fileName?: string | null) => {
  const [run] = await db
    .insert(careerImportRunsTable)
    .values({ sourceId, sourceKey, fileName: fileName ?? null, status: "running" })
    .returning();
  return run;
};

const recordImportFailure = async (
  runId: number,
  sourceId: number,
  error: string,
): Promise<void> => {
  const safeError = error.slice(0, 800);
  await db
    .update(careerImportRunsTable)
    .set({ status: "failed", error: safeError, completedAt: new Date() })
    .where(eq(careerImportRunsTable.id, runId));
  await db
    .update(careerDataSourcesTable)
    .set({ status: "error", lastAttemptAt: new Date(), lastError: safeError, updatedAt: new Date() })
    .where(eq(careerDataSourcesTable.id, sourceId));
};

const upsertSkillInTransaction = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  canonicalName: string,
  aliases: string[],
): Promise<number> => {
  const normalizedKey = normalizedSkillKey(canonicalName);
  if (!normalizedKey) throw new Error("A skill name could not be normalized.");
  const [skill] = await tx
    .insert(careerSkillsTable)
    .values({ canonicalName: canonicalName.trim(), normalizedKey, aliases })
    .onConflictDoUpdate({
      target: careerSkillsTable.normalizedKey,
      set: { canonicalName: canonicalName.trim(), aliases },
    })
    .returning({ id: careerSkillsTable.id });
  return skill.id;
};

const sourceRecordCount = async (sourceId: number, kind: string): Promise<number> => {
  if (kind === "workforce_context") {
    const [result] = await db.select({ total: count() }).from(careerWorkforceRecordsTable)
      .where(eq(careerWorkforceRecordsTable.sourceId, sourceId));
    return Number(result?.total ?? 0);
  }
  const table =
    kind === "occupations"
      ? careerOccupationsTable
      : kind === "jobs"
        ? careerJobAdsTable
        : careerTrendObservationsTable;
  const [result] = await db
    .select({ total: count() })
    .from(table)
    .where(eq(table.sourceId, sourceId));
  return Number(result?.total ?? 0);
};

const ensureRegistry = async (): Promise<void> => {
  const registry = [
    { key: "onet:31.0", name: "O*NET 31.0 occupations and transferable skills", kind: "occupations", status: "ready_to_import" },
    { key: "mycol", name: "MyCOL / MyMahir occupation data", kind: "occupations", status: "awaiting_dataset" },
    { key: "google-trends", name: "Google Trends search interest", kind: "trends", status: "awaiting_dataset" },
    { key: "adzuna", name: "Adzuna job advertisements", kind: "jobs", status: "credentials_and_permission_required" },
  ];
  for (const source of registry) {
    await db
      .insert(careerDataSourcesTable)
      .values({ ...source, metadata: {} })
      .onConflictDoNothing({ target: careerDataSourcesTable.key });
  }
};

router.get("/career/data-admin/status", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  await ensureRegistry();
  const sources = await db.select().from(careerDataSourcesTable).orderBy(careerDataSourcesTable.name);
  const sourceStatus = await Promise.all(
    sources.map(async (source) => ({
      key: source.key,
      name: source.name,
      kind: source.kind,
      status: source.status,
      lastAttemptAt: source.lastAttemptAt,
      lastSuccessAt: source.lastSuccessAt,
      lastError: source.lastError,
      countryCode: source.countryCode,
      region: source.region,
      recordCount: await sourceRecordCount(
        source.id,
        source.kind === "workforce_context" ? "workforce_context" : source.kind === "occupations" ? "occupations" : source.kind === "jobs" ? "jobs" : "trends",
      ),
    })),
  );
  const [occupationTotal] = await db.select({ total: count() }).from(careerOccupationsTable);
  const [skillTotal] = await db.select({ total: count() }).from(careerSkillsTable);
  const [jobTotal] = await db.select({ total: count() }).from(careerJobAdsTable);
  const [trendTotal] = await db.select({ total: count() }).from(careerTrendObservationsTable);
  const industryCounts = await db
    .select({ industry: careerOccupationsTable.industry, count: count() })
    .from(careerOccupationsTable)
    .groupBy(careerOccupationsTable.industry)
    .orderBy(desc(count()));
  const recentRuns = await db
    .select({
      id: careerImportRunsTable.id,
      sourceKey: careerImportRunsTable.sourceKey,
      status: careerImportRunsTable.status,
      importedCount: careerImportRunsTable.importedCount,
      updatedCount: careerImportRunsTable.updatedCount,
      skippedCount: careerImportRunsTable.skippedCount,
      error: careerImportRunsTable.error,
      startedAt: careerImportRunsTable.startedAt,
    })
    .from(careerImportRunsTable)
    .orderBy(desc(careerImportRunsTable.startedAt))
    .limit(10);

  res.json(
    GetCareerDataAdminStatusResponse.parse({
      sources: sourceStatus,
      occupationCountsByIndustry: industryCounts.map((row) => ({
        industry: row.industry,
        count: Number(row.count),
      })),
      totals: {
        occupations: Number(occupationTotal?.total ?? 0),
        skills: Number(skillTotal?.total ?? 0),
        jobAds: Number(jobTotal?.total ?? 0),
        trendObservations: Number(trendTotal?.total ?? 0),
      },
      recentRuns,
    }),
  );
});

router.post("/career/data-admin/import/occupations", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const parsedBody = ImportOccupationDatasetBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  const body = parsedBody.data;
  let parsedFile;
  try {
    parsedFile = parseOccupationImport(body.format, body.fileContent);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Occupation file could not be parsed." });
    return;
  }
  const sourceKey = `mycol:${slug(body.sourceName)}`;
  const source = await ensureSource({
    key: sourceKey,
    name: body.sourceName,
    kind: "occupations",
    status: "importing",
    sourceUrl: parsedFile.occupations[0]?.sourceUrl,
    license: body.license.trim(),
    publicationPeriod: parsedFile.occupations[0]?.publicationPeriod,
    metadata: { format: body.format, fileName: body.fileName, recordCount: parsedFile.occupations.length },
  });
  const run = await createImportRun(source.id, sourceKey, body.fileName);
  const aliasesByCanonical = new Map(
    parsedFile.skillAliases.map((group) => [
      normalizedSkillKey(group.canonicalName),
      group.aliases,
    ]),
  );
  let imported = 0;
  let updated = 0;
  try {
    await db.transaction(async (tx) => {
      for (const occupation of parsedFile.occupations) {
        const [existing] = await tx
          .select({ id: careerOccupationsTable.id })
          .from(careerOccupationsTable)
          .where(
            and(
              eq(careerOccupationsTable.sourceId, source.id),
              eq(careerOccupationsTable.externalId, occupation.externalId),
            ),
          )
          .limit(1);
        const [saved] = await tx
          .insert(careerOccupationsTable)
          .values({
            sourceId: source.id,
            externalId: occupation.externalId,
            title: occupation.title,
            normalizedTitle: normalizedSkillKey(occupation.title),
            industry: occupation.industry,
            sourceUrl: occupation.sourceUrl,
            publicationPeriod: occupation.publicationPeriod,
            shortageClassification: occupation.shortageClassification ?? null,
            metadata: { importRunId: run.id },
          })
          .onConflictDoUpdate({
            target: [careerOccupationsTable.sourceId, careerOccupationsTable.externalId],
            set: {
              title: occupation.title,
              normalizedTitle: normalizedSkillKey(occupation.title),
              industry: occupation.industry,
              sourceUrl: occupation.sourceUrl,
              publicationPeriod: occupation.publicationPeriod,
              shortageClassification: occupation.shortageClassification ?? null,
              metadata: { importRunId: run.id },
              updatedAt: new Date(),
            },
          })
          .returning({ id: careerOccupationsTable.id });
        if (existing) updated += 1;
        else imported += 1;

        await tx
          .delete(careerOccupationSkillsTable)
          .where(eq(careerOccupationSkillsTable.occupationId, saved.id));
        const links: Array<{ occupationId: number; skillId: number }> = [];
        for (const skillName of occupation.requiredSkills) {
          const aliases = aliasesByCanonical.get(normalizedSkillKey(skillName)) ?? [];
          const skillId = await upsertSkillInTransaction(tx, skillName, aliases);
          links.push({ occupationId: saved.id, skillId });
        }
        if (links.length) {
          await tx.insert(careerOccupationSkillsTable).values(links).onConflictDoNothing();
        }
      }
    });
    await db
      .update(careerImportRunsTable)
      .set({
        status: parsedFile.skipped ? "partially_succeeded" : "succeeded",
        importedCount: imported,
        updatedCount: updated,
        skippedCount: parsedFile.skipped,
        metadata: { warnings: parsedFile.warnings },
        completedAt: new Date(),
      })
      .where(eq(careerImportRunsTable.id, run.id));
    await db
      .update(careerDataSourcesTable)
      .set({
        status: "active",
        lastAttemptAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(careerDataSourcesTable.id, source.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The occupation import failed.";
    req.log.error({ err: error }, "Career occupation import failed");
    await recordImportFailure(run.id, source.id, message);
    res.status(500).json({ error: "Occupation records could not be saved. Review the import log and try again." });
    return;
  }
  res.status(201).json(
    ImportOccupationDatasetResponse.parse({
      importRunId: run.id,
      imported,
      updated,
      skipped: parsedFile.skipped,
      totalRecords: imported + updated + parsedFile.skipped,
      status: parsedFile.skipped ? "partially_succeeded" : "succeeded",
    }),
  );
});

router.post("/career/data-admin/onet/refresh", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  if (activeOnetRefresh) {
    res.status(409).json({ error: "An O*NET refresh is already running." });
    return;
  }
  activeOnetRefresh = true;
  const sourceKey = `onet:${ONET_RELEASE}`;
  let sourceId: number | null = null;
  let runId: number | null = null;

  try {
    const existingSources = await db
      .select()
      .from(careerDataSourcesTable)
      .where(eq(careerDataSourcesTable.key, sourceKey))
      .limit(1);
    const existingSource = existingSources[0];
    const metadata = existingSource?.metadata ?? {};
    const cachedResult = metadata.lastRefreshResult;
    const cacheIsFresh =
      existingSource?.status === "active" &&
      existingSource.lastSuccessAt !== null &&
      Date.now() - existingSource.lastSuccessAt.getTime() < 24 * 60 * 60 * 1000 &&
      metadata.releaseVersion === ONET_RELEASE &&
      metadata.softwareEvidenceVersion === 1 &&
      typeof cachedResult === "object" &&
      cachedResult !== null;

    if (cacheIsFresh) {
      const previous = cachedResult as Record<string, unknown>;
      res.json(
        RefreshOnetOccupationDataResponse.parse({
          version: ONET_RELEASE,
          cached: true,
          occupationsImported: Number(previous.occupationsImported ?? 0),
          occupationsUpdated: Number(previous.occupationsUpdated ?? 0),
          occupationFamilies: Number(previous.occupationFamilies ?? 0),
          skillsLinked: Number(previous.skillsLinked ?? 0),
          jobListingsLinked: Number(previous.jobListingsLinked ?? 0),
          skipped: Number(previous.skipped ?? 0),
          status: "cached",
          attribution: ONET_LICENSE_NOTICE,
          message: "O*NET 31.0 was imported successfully within the last 24 hours; no duplicate import was run.",
        }),
      );
      return;
    }

    const source = await ensureSource({
      key: sourceKey,
      name: `O*NET ${ONET_RELEASE} Database`,
      kind: "occupations",
      status: "importing",
      sourceUrl: ONET_SOURCE_URL,
      license: "CC BY 4.0",
      publicationPeriod: ONET_PUBLICATION_PERIOD,
      metadata: {
        releaseVersion: ONET_RELEASE,
        categorySource: "O*NET-SOC / 2018 SOC major groups",
        categorySourceUrl: SOC_TAXONOMY_URL,
        licenseUrl: ONET_LICENSE_URL,
      },
    });
    sourceId = source.id;
    const run = await createImportRun(source.id, sourceKey, `onet-${ONET_RELEASE}-official-csvs`);
    runId = run.id;
    await db
      .update(careerDataSourcesTable)
      .set({ lastAttemptAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(careerDataSourcesTable.id, source.id));

    const parsed = await fetchAndParseOnet31();
    if (!parsed.occupations.length) {
      throw new Error("The official O*NET files contained no importable occupation records.");
    }
    const existingRows = await db
      .select({ externalId: careerOccupationsTable.externalId })
      .from(careerOccupationsTable)
      .where(eq(careerOccupationsTable.sourceId, source.id));
    const existingCodes = new Set(existingRows.map((row) => row.externalId));

    const importedCounts = await db.transaction(async (tx) => {
      const skillRows = await tx
        .insert(careerSkillsTable)
        .values(
          parsed.skillNames.map((canonicalName) => ({
            canonicalName,
            normalizedKey: normalizedSkillKey(canonicalName),
            aliases: [],
          })),
        )
        .onConflictDoUpdate({
          target: careerSkillsTable.normalizedKey,
          set: { canonicalName: sql`excluded.canonical_name` },
        })
        .returning({ id: careerSkillsTable.id, normalizedKey: careerSkillsTable.normalizedKey });
      const skillIds = new Map(skillRows.map((row) => [row.normalizedKey, row.id]));

      const occupationRows = await tx
        .insert(careerOccupationsTable)
        .values(
          parsed.occupations.map((occupation) => ({
            sourceId: source.id,
            externalId: occupation.externalId,
            title: occupation.title,
            normalizedTitle: normalizedSkillKey(occupation.title),
            industry: occupation.industry,
            countryCode: null,
            region: null,
            sourceUrl: occupation.sourceUrl,
            publicationPeriod: occupation.publicationPeriod,
            shortageClassification: null,
            metadata: { ...occupation.metadata, importRunId: run.id },
          })),
        )
        .onConflictDoUpdate({
          target: [careerOccupationsTable.sourceId, careerOccupationsTable.externalId],
          set: {
            title: sql`excluded.title`,
            normalizedTitle: sql`excluded.normalized_title`,
            industry: sql`excluded.industry`,
            countryCode: null,
            region: null,
            sourceUrl: sql`excluded.source_url`,
            publicationPeriod: sql`excluded.publication_period`,
            shortageClassification: null,
            metadata: sql`excluded.metadata`,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: careerOccupationsTable.id,
          externalId: careerOccupationsTable.externalId,
          normalizedTitle: careerOccupationsTable.normalizedTitle,
        });
      const occupationIds = new Map(occupationRows.map((row) => [row.externalId, row.id]));
      const allOccupationIds = occupationRows.map((row) => row.id);
      if (allOccupationIds.length) {
        await tx
          .delete(careerOccupationSkillsTable)
          .where(inArray(careerOccupationSkillsTable.occupationId, allOccupationIds));
      }

      const skillLinks = parsed.occupations.flatMap((occupation) =>
        occupation.requiredSkills.flatMap((skillName) => {
          const skillId = skillIds.get(normalizedSkillKey(skillName));
          const occupationId = occupationIds.get(occupation.externalId);
          return skillId && occupationId
            ? [{ occupationId, skillId, requirementType: "transferable_skill" }]
            : [];
        }),
      );
      for (let offset = 0; offset < skillLinks.length; offset += 500) {
        await tx
          .insert(careerOccupationSkillsTable)
          .values(skillLinks.slice(offset, offset + 500))
          .onConflictDoUpdate({
            target: [careerOccupationSkillsTable.occupationId, careerOccupationSkillsTable.skillId],
            set: { requirementType: "transferable_skill" },
          });
      }

      const idsByTitle = new Map<string, number | null>();
      for (const row of occupationRows) {
        idsByTitle.set(
          row.normalizedTitle,
          idsByTitle.has(row.normalizedTitle) ? null : row.id,
        );
      }
      const unlinkedListings = await tx
        .select({ id: careerJobAdsTable.id, title: careerJobAdsTable.title })
        .from(careerJobAdsTable)
        .where(isNull(careerJobAdsTable.occupationId));
      const listingAssignments = unlinkedListings.flatMap((listing) => {
        const occupationId = idsByTitle.get(normalizedSkillKey(listing.title));
        return occupationId ? [{ id: listing.id, occupationId }] : [];
      });
      let jobListingsLinked = 0;
      for (let offset = 0; offset < listingAssignments.length; offset += 400) {
        const batch = listingAssignments.slice(offset, offset + 400);
        const cases = sql.join(
          batch.map((assignment) => sql`WHEN ${careerJobAdsTable.id} = ${assignment.id} THEN ${assignment.occupationId}`),
          sql` `,
        );
        const linked = await tx
          .update(careerJobAdsTable)
          .set({ occupationId: sql`CASE ${cases} ELSE ${careerJobAdsTable.occupationId} END` })
          .where(
            and(
              inArray(careerJobAdsTable.id, batch.map((assignment) => assignment.id)),
              isNull(careerJobAdsTable.occupationId),
            ),
          )
          .returning({ id: careerJobAdsTable.id });
        jobListingsLinked += linked.length;
      }
      return { skillsLinked: skillLinks.length, jobListingsLinked };
    });

    const occupationsImported = parsed.occupations.filter((occupation) => !existingCodes.has(occupation.externalId)).length;
    const occupationsUpdated = parsed.occupations.length - occupationsImported;
    const refreshResult = {
      occupationsImported,
      occupationsUpdated,
      occupationFamilies: parsed.occupationFamilies,
      skillsLinked: importedCounts.skillsLinked,
      jobListingsLinked: importedCounts.jobListingsLinked,
      skipped: parsed.skipped,
    };
    await db
      .update(careerImportRunsTable)
      .set({
        status: parsed.skipped ? "partially_succeeded" : "succeeded",
        importedCount: occupationsImported,
        updatedCount: occupationsUpdated,
        skippedCount: parsed.skipped,
        metadata: { sourceFileRows: parsed.sourceFileRows, releaseVersion: ONET_RELEASE },
        completedAt: new Date(),
      })
      .where(eq(careerImportRunsTable.id, run.id));
    await db
      .update(careerDataSourcesTable)
      .set({
        status: "active",
        lastAttemptAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        metadata: {
          releaseVersion: ONET_RELEASE,
          softwareEvidenceVersion: 1,
          categorySource: "O*NET-SOC / 2018 SOC major groups",
          categorySourceUrl: SOC_TAXONOMY_URL,
          licenseUrl: ONET_LICENSE_URL,
          sourceFileRows: parsed.sourceFileRows,
          lastRefreshResult: refreshResult,
          skillSelection: "Top 10 importance-rated transferable-skill signals, plus source-listed software examples. Neither is a universal list of mandatory qualifications.",
        },
        updatedAt: new Date(),
      })
      .where(eq(careerDataSourcesTable.id, source.id));

    res.json(
      RefreshOnetOccupationDataResponse.parse({
        version: ONET_RELEASE,
        cached: false,
        ...refreshResult,
        status: parsed.skipped ? "partially_succeeded" : "succeeded",
        attribution: ONET_LICENSE_NOTICE,
        message: `Imported ${parsed.occupations.length} O*NET occupations across ${parsed.occupationFamilies} occupation families. Ratings are transferable-skill signals, not mandatory qualifications.`,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "O*NET import failed.";
    if (runId !== null && sourceId !== null) {
      await recordImportFailure(runId, sourceId, message);
    }
    req.log.error({ error: message }, "O*NET occupation import failed");
    res.status(502).json({ error: message });
  } finally {
    activeOnetRefresh = false;
  }
});

router.post("/career/data-admin/import/google-trends", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const parsedBody = ImportGoogleTrendsBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  const body = parsedBody.data;
  const periodStart = body.periodStart.toISOString().slice(0, 10);
  const periodEnd = body.periodEnd.toISOString().slice(0, 10);
  const extractionDate = body.extractionDate.toISOString().slice(0, 10);
  if (periodStart > periodEnd || extractionDate < periodEnd) {
    res.status(400).json({ error: "Choose a valid time window and an extraction date on or after its end." });
    return;
  }
  let rows;
  try {
    rows = parseGoogleTrendsCsv(body.fileContent, body.skill);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Google Trends CSV could not be parsed." });
    return;
  }
  const inPeriod = rows.filter((row) => row.date >= periodStart && row.date <= periodEnd);
  const skipped = rows.length - inPeriod.length;
  if (!inPeriod.length) {
    res.status(400).json({ error: "No valid observations fall inside the supplied time window." });
    return;
  }
  const sourceKey = `google-trends:${slug(body.sourceName)}:${slug(body.region)}`;
  const source = await ensureSource({
    key: sourceKey,
    name: body.sourceName,
    kind: "trends",
    status: "importing",
    sourceUrl: body.sourceUrl,
    license: body.license.trim(),
    region: body.region.trim(),
    publicationPeriod: `${periodStart} to ${periodEnd}`,
    metadata: {
      fileName: body.fileName,
      extractionDate,
      interpretation: "Relative Google search interest; not vacancy counts.",
    },
  });
  const run = await createImportRun(source.id, sourceKey, body.fileName);
  const grouped = new Map<string, typeof inPeriod>();
  for (const row of inPeriod) {
    const group = grouped.get(row.skill) ?? [];
    group.push(row);
    grouped.set(row.skill, group);
  }
  let imported = 0;
  try {
    await db.transaction(async (tx) => {
      for (const [skillName, series] of grouped) {
        const [skill] = await tx
          .insert(careerSkillsTable)
          .values({ canonicalName: skillName, normalizedKey: normalizedSkillKey(skillName), aliases: [] })
          .onConflictDoUpdate({
            target: careerSkillsTable.normalizedKey,
            set: { canonicalName: skillName },
          })
          .returning({ id: careerSkillsTable.id });
        const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
        const values = sorted.map((item) => item.interest);
        for (const [index, observation] of sorted.entries()) {
          const direction = classifyInterestDirection(values.slice(0, index + 1));
          await tx
            .insert(careerTrendObservationsTable)
            .values({
              sourceId: source.id,
              skillId: skill.id,
              region: body.region.trim(),
              periodStart,
              periodEnd,
              observationDate: observation.date,
              interestValue: observation.interest,
              direction,
              sourceUrl: body.sourceUrl,
              license: body.license.trim(),
            })
            .onConflictDoUpdate({
              target: [
                careerTrendObservationsTable.sourceId,
                careerTrendObservationsTable.skillId,
                careerTrendObservationsTable.region,
                careerTrendObservationsTable.observationDate,
              ],
              set: {
                periodStart,
                periodEnd,
                interestValue: observation.interest,
                direction,
                sourceUrl: body.sourceUrl,
                license: body.license.trim(),
              },
            });
          imported += 1;
        }
      }
    });
    await db
      .update(careerImportRunsTable)
      .set({
        status: skipped ? "partially_succeeded" : "succeeded",
        importedCount: imported,
        skippedCount: skipped,
        metadata: { region: body.region, periodStart, periodEnd, extractionDate },
        completedAt: new Date(),
      })
      .where(eq(careerImportRunsTable.id, run.id));
    await db
      .update(careerDataSourcesTable)
      .set({
        status: "active",
        lastAttemptAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(careerDataSourcesTable.id, source.id));
  } catch (error) {
    req.log.error({ err: error }, "Google Trends import failed");
    await recordImportFailure(run.id, source.id, "Google Trends observations could not be saved.");
    res.status(500).json({ error: "Google Trends observations could not be saved. Review the import log and try again." });
    return;
  }
  res.status(201).json(
    ImportGoogleTrendsResponse.parse({
      importRunId: run.id,
      imported,
      skipped,
      totalRecords: imported + skipped,
      status: skipped ? "partially_succeeded" : "succeeded",
    }),
  );
});

router.post("/career/data-admin/adzuna/refresh", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const parsedBody = RefreshAdzunaDataBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  try {
    const result = await refreshAdzunaMarket(
      parsedBody.data.countryCode,
      Number(parsedBody.data.pagesPerCategory ?? 1),
    );
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Adzuna refresh failed. The last successful snapshot was left intact.";
    if (!(error instanceof AdzunaApiError)) req.log.error({ err: error }, "Adzuna refresh failed");
    res.status(error instanceof AdzunaApiError ? error.statusCode : 502).json({ error: message });
  }
});

router.post("/career/data-admin/theirstack/refresh", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const parsedBody = RefreshTheirStackDataBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  let countryCode: string;
  try {
    countryCode = normalizeTheirStackCountryCode(parsedBody.data.countryCode);
  } catch (error) {
    res.status(error instanceof TheirStackApiError ? error.statusCode : 400).json({
      error: error instanceof Error ? error.message : "Enter a valid two-letter country code.",
    });
    return;
  }

  const postedAtMaxAgeDays = parsedBody.data.postedAtMaxAgeDays ?? 30;
  const limit = parsedBody.data.limit ?? 10;
  const sourceKey = `theirstack:${countryCode.toLowerCase()}`;
  if (activeTheirStackRefreshes.has(sourceKey)) {
    res.status(409).json({ error: "A TheirStack refresh for this country is already running." });
    return;
  }

  const existingSources = await db
    .select()
    .from(careerDataSourcesTable)
    .where(eq(careerDataSourcesTable.key, sourceKey))
    .limit(1);
  const existingSource = existingSources[0];
  const existingMetadata = (existingSource?.metadata ?? {}) as Record<string, unknown>;
  const sameFilters =
    Number(existingMetadata.postedAtMaxAgeDays) === postedAtMaxAgeDays &&
    Number(existingMetadata.limit) === limit;
  const recentSuccess = existingSource?.lastSuccessAt;
  if (recentSuccess && sameFilters && Date.now() - recentSuccess.getTime() < 15 * 60 * 1000) {
    res.json(
      RefreshTheirStackDataResponse.parse({
        countryCode,
        cached: true,
        postedAtMaxAgeDays,
        requestedLimit: limit,
        returned: Number(existingMetadata.lastReturned ?? 0),
        creditsConsumed: 0,
        providerTotalResults:
          typeof existingMetadata.providerTotalResults === "number"
            ? existingMetadata.providerTotalResults
            : null,
        imported: Number(existingMetadata.lastImported ?? 0),
        updated: Number(existingMetadata.lastUpdated ?? 0),
        skipped: Number(existingMetadata.lastSkipped ?? 0),
        status: "cached",
        attributionRequired: true,
        message: "A matching TheirStack search is cached. Imported listings retain their original URLs and require TheirStack attribution.",
      }),
    );
    return;
  }

  if (activeTheirStackRefreshes.has(sourceKey)) {
    res.status(409).json({ error: "A TheirStack refresh for this country is already running." });
    return;
  }
  activeTheirStackRefreshes.add(sourceKey);
  let runId: number | null = null;
  let sourceId: number | null = null;
  try {
    const source = await ensureSource({
      key: sourceKey,
      name: `TheirStack job advertisements (${countryCode})`,
      kind: "jobs",
      status: "syncing",
      countryCode,
      sourceUrl: "https://theirstack.com/en/docs/api-reference/jobs/search_jobs_v1",
      license: "TheirStack Terms and Conditions; retain original listing URLs and show source attribution. Do not redistribute bulk datasets.",
      metadata: existingMetadata,
    });
    sourceId = source.id;
    const run = await createImportRun(source.id, sourceKey);
    runId = run.id;
    await db
      .update(careerDataSourcesTable)
      .set({ lastAttemptAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(careerDataSourcesTable.id, source.id));

    const result = await fetchTheirStackListings(countryCode, postedAtMaxAgeDays, limit);
    const normalizedTitles = new Set(result.listings.map((listing) => normalizedSkillKey(listing.title)));
    const occupationRows = await db
      .select({ id: careerOccupationsTable.id, normalizedTitle: careerOccupationsTable.normalizedTitle })
      .from(careerOccupationsTable);
    const occupationByTitle = new Map(
      occupationRows
        .filter((row) => normalizedTitles.has(row.normalizedTitle))
        .map((row) => [row.normalizedTitle, row.id]),
    );
    const externalIds = result.listings.map((listing) => listing.externalId);
    const existingListings = externalIds.length
      ? await db
          .select({ externalId: careerJobAdsTable.externalId })
          .from(careerJobAdsTable)
          .where(
            and(
              eq(careerJobAdsTable.sourceId, source.id),
              inArray(careerJobAdsTable.externalId, externalIds),
            ),
          )
      : [];
    const existingIds = new Set(existingListings.map((listing) => listing.externalId));
    if (result.listings.length) {
      await db
        .insert(careerJobAdsTable)
        .values(
          result.listings.map((listing) => ({
            sourceId: source.id,
            externalId: listing.externalId,
            occupationId: occupationByTitle.get(normalizedSkillKey(listing.title)) ?? null,
            title: listing.title,
            company: listing.company,
            location: listing.location,
            countryCode,
            category: listing.industry,
            listingUrl: listing.listingUrl,
            postedAt: listing.postedAt,
            fetchedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: [careerJobAdsTable.sourceId, careerJobAdsTable.externalId],
          set: {
            occupationId: sql`excluded.occupation_id`,
            title: sql`excluded.title`,
            company: sql`excluded.company`,
            location: sql`excluded.location`,
            category: sql`excluded.category`,
            listingUrl: sql`excluded.listing_url`,
            postedAt: sql`excluded.posted_at`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        });
    }

    const imported = result.listings.filter((listing) => !existingIds.has(listing.externalId)).length;
    const updated = result.listings.length - imported;
    const skipped = result.skipped;
    const status = skipped ? "partially_succeeded" : "succeeded";
    const sourceMetadata = {
      postedAtMaxAgeDays,
      limit,
      lastReturned: result.creditsConsumed,
      lastCreditsConsumed: result.creditsConsumed,
      providerTotalResults: result.providerTotalResults,
      lastImported: imported,
      lastUpdated: updated,
      lastSkipped: skipped,
    };
    await db
      .update(careerImportRunsTable)
      .set({
        status,
        importedCount: imported,
        updatedCount: updated,
        skippedCount: skipped,
        metadata: {
          countryCode,
          postedAtMaxAgeDays,
          requestedLimit: limit,
          returned: result.creditsConsumed,
          creditsConsumed: result.creditsConsumed,
          providerTotalResults: result.providerTotalResults,
          sourceName: "TheirStack",
          descriptionsStored: false,
        },
        completedAt: new Date(),
      })
      .where(eq(careerImportRunsTable.id, run.id));
    await db
      .update(careerDataSourcesTable)
      .set({
        status: "active",
        countryCode,
        lastSuccessAt: new Date(),
        lastError: null,
        metadata: sourceMetadata,
        updatedAt: new Date(),
      })
      .where(eq(careerDataSourcesTable.id, source.id));

    res.json(
      RefreshTheirStackDataResponse.parse({
        countryCode,
        cached: false,
        postedAtMaxAgeDays,
        requestedLimit: limit,
        returned: result.creditsConsumed,
        creditsConsumed: result.creditsConsumed,
        providerTotalResults: result.providerTotalResults,
        imported,
        updated,
        skipped,
        status,
        attributionRequired: true,
        message: "A bounded sample of recent listings was saved. Counts describe returned listings, not the full job market; preserve TheirStack attribution and the original posting links.",
      }),
    );
  } catch (error) {
    const message =
      error instanceof TheirStackApiError
        ? error.message
        : "TheirStack refresh failed. Previously imported listings were left intact.";
    if (runId !== null && sourceId !== null) await recordImportFailure(runId, sourceId, message);
    if (!(error instanceof TheirStackApiError)) req.log.error({ err: error }, "TheirStack refresh failed");
    res.status(error instanceof TheirStackApiError ? error.statusCode : 502).json({ error: message });
  } finally {
    activeTheirStackRefreshes.delete(sourceKey);
  }
});

router.post("/career/data-admin/theirstack/refresh", async (req, res): Promise<void> => {
  if (!requireCareerDataAdmin(req, res)) return;
  const parsedBody = RefreshTheirStackDataBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  let countryCode: string;
  try {
    countryCode = normalizeTheirStackCountryCode(parsedBody.data.countryCode);
  } catch (error) {
    res.status(error instanceof TheirStackApiError ? error.statusCode : 400).json({
      error: error instanceof Error ? error.message : "Enter a valid two-letter country code.",
    });
    return;
  }

  const postedAtMaxAgeDays = parsedBody.data.postedAtMaxAgeDays ?? 30;
  const limit = parsedBody.data.limit ?? 10;
  const sourceKey = `theirstack:${countryCode.toLowerCase()}`;
  if (activeTheirStackRefreshes.has(sourceKey)) {
    res.status(409).json({ error: "A TheirStack refresh for this country is already running." });
    return;
  }

  const existingSources = await db
    .select()
    .from(careerDataSourcesTable)
    .where(eq(careerDataSourcesTable.key, sourceKey))
    .limit(1);
  const existingSource = existingSources[0];
  const existingMetadata = (existingSource?.metadata ?? {}) as Record<string, unknown>;
  const sameFilters =
    Number(existingMetadata.postedAtMaxAgeDays) === postedAtMaxAgeDays &&
    Number(existingMetadata.limit) === limit;
  const recentSuccess = existingSource?.lastSuccessAt;
  if (recentSuccess && sameFilters && Date.now() - recentSuccess.getTime() < 15 * 60 * 1000) {
    res.json(
      RefreshTheirStackDataResponse.parse({
        countryCode,
        cached: true,
        postedAtMaxAgeDays,
        requestedLimit: limit,
        returned: Number(existingMetadata.lastReturned ?? 0),
        creditsConsumed: 0,
        providerTotalResults:
          typeof existingMetadata.providerTotalResults === "number"
            ? existingMetadata.providerTotalResults
            : null,
        imported: Number(existingMetadata.lastImported ?? 0),
        updated: Number(existingMetadata.lastUpdated ?? 0),
        skipped: Number(existingMetadata.lastSkipped ?? 0),
        status: "cached",
        attributionRequired: true,
        message: "A matching TheirStack search is cached. Imported listings retain their original URLs and require TheirStack attribution.",
      }),
    );
    return;
  }

  if (activeTheirStackRefreshes.has(sourceKey)) {
    res.status(409).json({ error: "A TheirStack refresh for this country is already running." });
    return;
  }
  activeTheirStackRefreshes.add(sourceKey);
  let runId: number | null = null;
  let sourceId: number | null = null;
  try {
    const source = await ensureSource({
      key: sourceKey,
      name: `TheirStack job advertisements (${countryCode})`,
      kind: "jobs",
      status: "syncing",
      countryCode,
      sourceUrl: "https://theirstack.com/en/docs/api-reference/jobs/search_jobs_v1",
      license: "TheirStack Terms and Conditions; retain original listing URLs and show source attribution. Do not redistribute bulk datasets.",
      metadata: existingMetadata,
    });
    sourceId = source.id;
    const run = await createImportRun(source.id, sourceKey);
    runId = run.id;
    await db
      .update(careerDataSourcesTable)
      .set({ lastAttemptAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(careerDataSourcesTable.id, source.id));

    const result = await fetchTheirStackListings(countryCode, postedAtMaxAgeDays, limit);
    const normalizedTitles = new Set(result.listings.map((listing) => normalizedSkillKey(listing.title)));
    const occupationRows = await db
      .select({ id: careerOccupationsTable.id, normalizedTitle: careerOccupationsTable.normalizedTitle })
      .from(careerOccupationsTable);
    const occupationByTitle = new Map(
      occupationRows
        .filter((row) => normalizedTitles.has(row.normalizedTitle))
        .map((row) => [row.normalizedTitle, row.id]),
    );
    const externalIds = result.listings.map((listing) => listing.externalId);
    const existingListings = externalIds.length
      ? await db
          .select({ externalId: careerJobAdsTable.externalId })
          .from(careerJobAdsTable)
          .where(
            and(
              eq(careerJobAdsTable.sourceId, source.id),
              inArray(careerJobAdsTable.externalId, externalIds),
            ),
          )
      : [];
    const existingIds = new Set(existingListings.map((listing) => listing.externalId));
    if (result.listings.length) {
      await db
        .insert(careerJobAdsTable)
        .values(
          result.listings.map((listing) => ({
            sourceId: source.id,
            externalId: listing.externalId,
            occupationId: occupationByTitle.get(normalizedSkillKey(listing.title)) ?? null,
            title: listing.title,
            company: listing.company,
            location: listing.location,
            countryCode,
            category: listing.industry,
            listingUrl: listing.listingUrl,
            postedAt: listing.postedAt,
            fetchedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: [careerJobAdsTable.sourceId, careerJobAdsTable.externalId],
          set: {
            occupationId: sql`excluded.occupation_id`,
            title: sql`excluded.title`,
            company: sql`excluded.company`,
            location: sql`excluded.location`,
            category: sql`excluded.category`,
            listingUrl: sql`excluded.listing_url`,
            postedAt: sql`excluded.posted_at`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        });
    }

    const imported = result.listings.filter((listing) => !existingIds.has(listing.externalId)).length;
    const updated = result.listings.length - imported;
    const skipped = result.skipped;
    const status = skipped ? "partially_succeeded" : "succeeded";
    const sourceMetadata = {
      postedAtMaxAgeDays,
      limit,
      lastReturned: result.creditsConsumed,
      lastCreditsConsumed: result.creditsConsumed,
      providerTotalResults: result.providerTotalResults,
      lastImported: imported,
      lastUpdated: updated,
      lastSkipped: skipped,
    };
    await db
      .update(careerImportRunsTable)
      .set({
        status,
        importedCount: imported,
        updatedCount: updated,
        skippedCount: skipped,
        metadata: {
          countryCode,
          postedAtMaxAgeDays,
          requestedLimit: limit,
          returned: result.creditsConsumed,
          creditsConsumed: result.creditsConsumed,
          providerTotalResults: result.providerTotalResults,
          sourceName: "TheirStack",
          descriptionsStored: false,
        },
        completedAt: new Date(),
      })
      .where(eq(careerImportRunsTable.id, run.id));
    await db
      .update(careerDataSourcesTable)
      .set({
        status: "active",
        countryCode,
        lastSuccessAt: new Date(),
        lastError: null,
        metadata: sourceMetadata,
        updatedAt: new Date(),
      })
      .where(eq(careerDataSourcesTable.id, source.id));

    res.json(
      RefreshTheirStackDataResponse.parse({
        countryCode,
        cached: false,
        postedAtMaxAgeDays,
        requestedLimit: limit,
        returned: result.creditsConsumed,
        creditsConsumed: result.creditsConsumed,
        providerTotalResults: result.providerTotalResults,
        imported,
        updated,
        skipped,
        status,
        attributionRequired: true,
        message: "A bounded sample of recent listings was saved. Counts describe returned listings, not the full job market; preserve TheirStack attribution and the original posting links.",
      }),
    );
  } catch (error) {
    const message =
      error instanceof TheirStackApiError
        ? error.message
        : "TheirStack refresh failed. Previously imported listings were left intact.";
    if (runId !== null && sourceId !== null) await recordImportFailure(runId, sourceId, message);
    if (!(error instanceof TheirStackApiError)) req.log.error({ err: error }, "TheirStack refresh failed");
    res.status(error instanceof TheirStackApiError ? error.statusCode : 502).json({ error: message });
  } finally {
    activeTheirStackRefreshes.delete(sourceKey);
  }
});

export default router;

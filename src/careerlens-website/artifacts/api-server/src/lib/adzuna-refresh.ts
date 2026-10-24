import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { RefreshAdzunaDataResponse } from "@workspace/api-zod";
import {
  careerDataSourcesTable,
  careerImportRunsTable,
  careerJobAdsTable,
  careerOccupationsTable,
  db,
} from "@workspace/db";
import { normalizedSkillKey } from "./career-data-imports";
import {
  AdzunaApiError,
  discoverAdzunaCategories,
  fetchAdzunaListings,
  normalizeAdzunaCountryCode,
} from "./adzuna";

const activeAdzunaRefreshes = new Set<string>();
const ADZUNA_SOURCE_URL = "https://developer.adzuna.com/docs/search";
const ADZUNA_LICENSE = "Adzuna API terms; ongoing use requires written consent where applicable.";
const ADZUNA_MANUAL_COOLDOWN_MS = 15 * 60 * 1000;

const isPermissionApproved = (): boolean =>
  process.env.ADZUNA_USAGE_APPROVED?.trim().toLowerCase() === "true";

const recordImportFailure = async (runId: number, sourceId: number, error: string): Promise<void> => {
  const safeError = error.slice(0, 800);
  await db
    .update(careerImportRunsTable)
    .set({ status: "failed", error: safeError, completedAt: new Date() })
    .where(eq(careerImportRunsTable.id, runId));
  await db
    .update(careerDataSourcesTable)
    .set({
      status: "error",
      lastAttemptAt: new Date(),
      lastError: safeError,
      updatedAt: new Date(),
    })
    .where(eq(careerDataSourcesTable.id, sourceId));
};

export const refreshAdzunaMarket = async (
  countryInput: string,
  pagesPerCategory = 1,
): Promise<ReturnType<typeof RefreshAdzunaDataResponse.parse>> => {
  if (!isPermissionApproved()) {
    throw new AdzunaApiError(
      "Live Adzuna sync is disabled. Confirm written permission for this project's ongoing use and set ADZUNA_USAGE_APPROVED=true in Replit Secrets.",
      403,
    );
  }

  const countryCode = normalizeAdzunaCountryCode(countryInput).toUpperCase();
  const sourceKey = `adzuna:${countryCode.toLowerCase()}`;
  if (activeAdzunaRefreshes.has(sourceKey)) {
    throw new AdzunaApiError(`An Adzuna refresh is already running for ${countryCode}.`, 409);
  }
  activeAdzunaRefreshes.add(sourceKey);

  let runId: number | null = null;
  let sourceId = 0;
  try {
    const [existingSource] = await db
      .select()
      .from(careerDataSourcesTable)
      .where(eq(careerDataSourcesTable.key, sourceKey))
      .limit(1);
    const [source] = await db
      .insert(careerDataSourcesTable)
      .values({
        key: sourceKey,
        name: `Adzuna job advertisements (${countryCode})`,
        kind: "jobs",
        status: "checking_country",
        countryCode,
        sourceUrl: ADZUNA_SOURCE_URL,
        license: ADZUNA_LICENSE,
        metadata: existingSource?.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: careerDataSourcesTable.key,
        set: {
          name: `Adzuna job advertisements (${countryCode})`,
          kind: "jobs",
          status: "checking_country",
          countryCode,
          sourceUrl: ADZUNA_SOURCE_URL,
          license: ADZUNA_LICENSE,
          metadata: existingSource?.metadata ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();
    sourceId = source.id;

    if (source.lastSuccessAt && Date.now() - source.lastSuccessAt.getTime() < ADZUNA_MANUAL_COOLDOWN_MS) {
      await db
        .update(careerDataSourcesTable)
        .set({ status: existingSource?.status ?? "active", updatedAt: new Date() })
        .where(eq(careerDataSourcesTable.id, source.id));
      const metadata = (source.metadata ?? {}) as Record<string, unknown>;
      return RefreshAdzunaDataResponse.parse({
        countryCode,
        cached: true,
        categoriesVerified: true,
        categoriesFound: Number(metadata.categoriesFound ?? 0),
        imported: 0,
        updated: 0,
        skipped: 0,
        status: "cached",
        attributionRequired: true,
        message: "A successful Adzuna refresh is already cached for this country.",
      });
    }

    const [run] = await db
      .insert(careerImportRunsTable)
      .values({ sourceId, sourceKey, status: "running" })
      .returning();
    runId = run.id;
    const attemptedAt = new Date();
    await db
      .update(careerDataSourcesTable)
      .set({ lastAttemptAt: attemptedAt, lastError: null, updatedAt: attemptedAt })
      .where(eq(careerDataSourcesTable.id, sourceId));

    // Verify the country catalog before making any job-search request.
    const categories = await discoverAdzunaCategories(countryCode);
    const { listings, skipped: invalidListings } = await fetchAdzunaListings(
      countryCode,
      categories,
      pagesPerCategory,
    );
    const normalizedTitles = new Set(listings.map((listing) => normalizedSkillKey(listing.title)));
    const occupationRows = await db
      .select({ id: careerOccupationsTable.id, normalizedTitle: careerOccupationsTable.normalizedTitle })
      .from(careerOccupationsTable);
    const occupationByTitle = new Map(
      occupationRows
        .filter((row) => normalizedTitles.has(row.normalizedTitle))
        .map((row) => [row.normalizedTitle, row.id]),
    );
    const existingRows = listings.length
      ? await db
          .select({ externalId: careerJobAdsTable.externalId })
          .from(careerJobAdsTable)
          .where(
            and(
              eq(careerJobAdsTable.sourceId, sourceId),
              inArray(careerJobAdsTable.externalId, listings.map((listing) => listing.externalId)),
            ),
          )
      : [];
    const existingIds = new Set(existingRows.map((row) => row.externalId));
    const imported = listings.filter((listing) => !existingIds.has(listing.externalId)).length;
    const updated = listings.length - imported;
    const snapshotAt = new Date();
    const metadata = {
      categoriesFound: categories.length,
      categories: categories.map(({ label, tag }) => ({ label, tag })),
      pagesPerCategory,
    };

    // Publish the replacement snapshot and success metadata atomically. If any
    // write fails, the previous successful snapshot remains untouched.
    await db.transaction(async (tx) => {
      for (let offset = 0; offset < listings.length; offset += 100) {
        const batch = listings.slice(offset, offset + 100);
        await tx
          .insert(careerJobAdsTable)
          .values(
            batch.map((listing) => ({
              sourceId,
              externalId: listing.externalId,
              occupationId: occupationByTitle.get(normalizedSkillKey(listing.title)) ?? null,
              title: listing.title,
              company: listing.company,
              location: listing.location,
              countryCode,
              category: listing.category,
              listingUrl: listing.listingUrl,
              postedAt: listing.postedAt,
              fetchedAt: snapshotAt,
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
      if (listings.length) {
        await tx
          .delete(careerJobAdsTable)
          .where(
            and(
              eq(careerJobAdsTable.sourceId, sourceId),
              notInArray(careerJobAdsTable.externalId, listings.map((listing) => listing.externalId)),
            ),
          );
      } else {
        await tx.delete(careerJobAdsTable).where(eq(careerJobAdsTable.sourceId, sourceId));
      }
      await tx
        .update(careerImportRunsTable)
        .set({
          status: invalidListings ? "partially_succeeded" : "succeeded",
          importedCount: imported,
          updatedCount: updated,
          skippedCount: invalidListings,
          metadata: { ...metadata, countryCode },
          completedAt: snapshotAt,
        })
        .where(eq(careerImportRunsTable.id, run.id));
      await tx
        .update(careerDataSourcesTable)
        .set({
          status: "active",
          countryCode,
          lastSuccessAt: snapshotAt,
          lastError: null,
          metadata,
          updatedAt: snapshotAt,
        })
        .where(eq(careerDataSourcesTable.id, sourceId));
    });

    return RefreshAdzunaDataResponse.parse({
      countryCode,
      cached: false,
      categoriesVerified: true,
      categoriesFound: categories.length,
      imported,
      updated,
      skipped: invalidListings,
      status: invalidListings ? "partially_succeeded" : "succeeded",
      attributionRequired: true,
      message: "Adzuna listings were refreshed as a dated snapshot. Published listings must carry Adzuna attribution.",
    });
  } catch (error) {
    if (runId !== null && sourceId !== null) {
      const message =
        error instanceof AdzunaApiError
          ? error.message
          : "Adzuna refresh failed. The last successful snapshot was left intact.";
      await recordImportFailure(runId, sourceId, message);
    }
    throw error;
  } finally {
    activeAdzunaRefreshes.delete(sourceKey);
  }
};

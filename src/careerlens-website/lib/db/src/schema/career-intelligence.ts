import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const careerDataSourcesTable = pgTable(
  "career_data_sources",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("awaiting_input"),
    sourceUrl: text("source_url"),
    license: text("license"),
    countryCode: text("country_code"),
    region: text("region"),
    publicationPeriod: text("publication_period"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: text("last_error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("career_data_sources_key_uidx").on(table.key)],
);

export const careerImportRunsTable = pgTable(
  "career_import_runs",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").references(() => careerDataSourcesTable.id, {
      onDelete: "set null",
    }),
    sourceKey: text("source_key").notNull(),
    fileName: text("file_name"),
    status: text("status").notNull(),
    importedCount: integer("imported_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("career_import_runs_source_started_idx").on(table.sourceKey, table.startedAt)],
);

export const careerSkillsTable = pgTable(
  "career_skills",
  {
    id: serial("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    normalizedKey: text("normalized_key").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("career_skills_normalized_key_uidx").on(table.normalizedKey),
  ],
);

export const careerOccupationsTable = pgTable(
  "career_occupations",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => careerDataSourcesTable.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    industry: text("industry").notNull(),
    countryCode: text("country_code"),
    region: text("region"),
    sourceUrl: text("source_url").notNull(),
    publicationPeriod: text("publication_period").notNull(),
    shortageClassification: text("shortage_classification"),
    sourceUpdatedAt: date("source_updated_at", { mode: "string" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("career_occupations_source_external_uidx").on(table.sourceId, table.externalId),
    index("career_occupations_industry_idx").on(table.industry),
    index("career_occupations_country_idx").on(table.countryCode),
  ],
);

export const careerOccupationSkillsTable = pgTable(
  "career_occupation_skills",
  {
    occupationId: integer("occupation_id")
      .notNull()
      .references(() => careerOccupationsTable.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => careerSkillsTable.id, { onDelete: "cascade" }),
    requirementType: text("requirement_type").notNull().default("required"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("career_occupation_skills_pair_uidx").on(table.occupationId, table.skillId),
    index("career_occupation_skills_skill_idx").on(table.skillId),
  ],
);

export const careerJobAdsTable = pgTable(
  "career_job_ads",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => careerDataSourcesTable.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    occupationId: integer("occupation_id").references(() => careerOccupationsTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    company: text("company"),
    location: text("location"),
    countryCode: text("country_code").notNull(),
    category: text("category"),
    listingUrl: text("listing_url").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("career_job_ads_source_external_uidx").on(table.sourceId, table.externalId),
    index("career_job_ads_country_posted_idx").on(table.countryCode, table.postedAt),
    index("career_job_ads_occupation_idx").on(table.occupationId),
  ],
);

export const careerTrendObservationsTable = pgTable(
  "career_trend_observations",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => careerDataSourcesTable.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => careerSkillsTable.id, { onDelete: "cascade" }),
    region: text("region").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    observationDate: date("observation_date", { mode: "string" }).notNull(),
    interestValue: integer("interest_value").notNull(),
    direction: text("direction").notNull(),
    sourceUrl: text("source_url").notNull(),
    license: text("license").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("career_trend_observations_unique_uidx").on(
      table.sourceId,
      table.skillId,
      table.region,
      table.observationDate,
    ),
    index("career_trend_observations_skill_date_idx").on(table.skillId, table.observationDate),
  ],
);

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  boolean, index, integer, jsonb, pgTable, real, serial, text,
  timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";
import { careerDataSourcesTable } from "./career-intelligence";

export const careerWorkforceRecordsTable = pgTable("career_workforce_records", {
  id: serial("id").primaryKey(),
  datasetKey: text("dataset_key").notNull(),
  externalId: text("external_id").notNull(),
  sourceId: integer("source_id").notNull().references(() => careerDataSourcesTable.id, { onDelete: "cascade" }),
  recordType: text("record_type", { enum: ["skill_rank", "occupation_direction"] }).notNull(),
  name: text("name").notNull(),
  direction: text("direction"),
  rank: integer("rank"),
  trendGroup: text("trend_group"),
  industryTags: text("industry_tags").array().notNull().default([]),
  industryTagsOfficial: boolean("industry_tags_official"),
  numericSkillScore: real("numeric_skill_score"),
  observationYear: integer("observation_year"),
  forecastEndYear: integer("forecast_end_year"),
  sourceFigure: text("source_figure"),
  sourceUrl: text("source_url").notNull(),
  dataType: text("data_type").notNull(),
  projectedGrowthPercent: real("projected_growth_percent"),
  aiReplacementProbability: real("ai_replacement_probability"),
  rawRecord: jsonb("raw_record").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("career_workforce_dataset_external_uidx").on(table.datasetKey, table.externalId),
  index("career_workforce_record_type_idx").on(table.datasetKey, table.recordType),
]);

export const insertCareerWorkforceRecordSchema = createInsertSchema(careerWorkforceRecordsTable)
  .omit({ id: true, createdAt: true });
export type InsertCareerWorkforceRecord = z.infer<typeof insertCareerWorkforceRecordSchema>;
export type CareerWorkforceRecord = typeof careerWorkforceRecordsTable.$inferSelect;

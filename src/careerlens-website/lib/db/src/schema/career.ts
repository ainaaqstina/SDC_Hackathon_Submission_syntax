import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const careerProfilesTable = pgTable("career_profiles", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const careerRoadmapsTable = pgTable("career_roadmaps", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

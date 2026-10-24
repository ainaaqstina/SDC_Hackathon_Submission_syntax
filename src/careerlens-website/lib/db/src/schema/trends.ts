import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const careerTrendSignalsTable = pgTable("career_trend_signals", {
  id: serial("id").primaryKey(),
  skill: text("skill").notNull(),
  direction: text("direction").notNull(),
  score: integer("score").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  license: text("license").notNull(),
  observedAt: date("observed_at", { mode: "string" }).notNull(),
  evidence: text("evidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

import { sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const accountabilityTone = pgEnum("accountability_tone", ["supportive", "direct", "off"]);

export const studySettings = pgTable("study_settings", {
  id: integer("id").primaryKey().default(1),
  timezone: text("timezone").notNull(),
  accountabilityTone: accountabilityTone("accountability_tone").notNull().default("direct"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("study_settings_singleton", sql`${table.id} = 1`)]);

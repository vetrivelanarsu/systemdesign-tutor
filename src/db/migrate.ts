import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getConfig } from "@/config";
import { getDatabase } from "./client";
import { studySettings } from "./schema";

export async function migrateDatabase(): Promise<void> {
  const database = getDatabase();
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(studySettings).values({ timezone: getConfig().STUDY_TIMEZONE }).onConflictDoNothing();
}

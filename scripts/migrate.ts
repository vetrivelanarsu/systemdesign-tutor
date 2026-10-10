import { closeDatabase } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";

try {
  await migrateDatabase();
  console.info("Database migrations applied.");
} catch {
  console.error("Migration failed. Check configuration, database availability, and pgvector installation.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

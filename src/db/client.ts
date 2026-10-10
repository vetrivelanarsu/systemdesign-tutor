import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getConfig } from "@/config";
import * as schema from "./schema";

const globalDatabase = globalThis as typeof globalThis & { tutorPool?: Pool };

export function getPool(): Pool {
  if (!globalDatabase.tutorPool) {
    globalDatabase.tutorPool = new Pool({
      connectionString: getConfig().DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000,
      statement_timeout: 2000,
      query_timeout: 3000,
    });
    // Idle connections can fail during a database restart. Do not emit credentials.
    globalDatabase.tutorPool.on("error", () => {
      console.error("An idle database connection failed; the next request will reconnect.");
    });
  }
  return globalDatabase.tutorPool;
}

export function getDatabase() {
  return drizzle(getPool(), { schema });
}

export async function closeDatabase(): Promise<void> {
  const pool = globalDatabase.tutorPool;
  delete globalDatabase.tutorPool;
  await pool?.end();
}

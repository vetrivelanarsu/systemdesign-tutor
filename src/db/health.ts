import { getPool } from "./client";

export type DatabaseReadiness = { database: boolean; vector: boolean; schema: boolean };

export async function probeDatabase(): Promise<DatabaseReadiness> {
  const result = await getPool().query<{ vector: boolean; schema: boolean }>(`
    SELECT
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS vector,
      to_regclass('public.study_settings') IS NOT NULL AS schema
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Database readiness query returned no result.");
  return { database: true, vector: row.vector, schema: row.schema };
}

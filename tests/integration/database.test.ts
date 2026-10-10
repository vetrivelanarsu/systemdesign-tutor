import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, getPool } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import { studySettings } from "@/db/schema";
import { GET } from "@/app/api/health/route";

describe("PostgreSQL + pgvector foundation", () => {
  beforeAll(async () => { await migrateDatabase(); });
  afterAll(async () => { await closeDatabase(); });

  it("can reapply migrations without duplicating singleton settings", async () => {
    await migrateDatabase();
    const settings = await getDatabase().select().from(studySettings);
    expect(settings).toHaveLength(1);
    expect(settings[0]?.id).toBe(1);
  });

  it("performs vector operations in the actual database", async () => {
    const result = await getPool().query<{ distance: number }>("SELECT '[1,2,3]'::vector <-> '[1,2,3]'::vector AS distance");
    expect(result.rows[0]?.distance).toBe(0);
  });

  it("enforces the single-user settings constraint", async () => {
    await expect(getDatabase().insert(studySettings).values({ id: 2, timezone: "UTC" })).rejects.toThrow();
  });

  it("returns HTTP 200 only after the real database is ready", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", checks: { database: true, vector: true, schema: true } });
  });
});

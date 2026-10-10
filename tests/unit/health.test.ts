import { describe, expect, it } from "vitest";
import { checkHealth } from "@/services/health";

describe("database readiness", () => {
  it("is healthy only when the database, vector extension, and schema are ready", async () => {
    expect(await checkHealth(async () => ({ database: true, vector: true, schema: true }))).toMatchObject({ status: "ok" });
  });

  it.each([
    { database: true, vector: false, schema: true },
    { database: true, vector: true, schema: false },
  ])("reports incomplete database setup as unavailable: %o", async (checks) => {
    expect(await checkHealth(async () => checks)).toEqual({ status: "unavailable", checks });
  });

  it("turns connection failures into a safe unavailable report", async () => {
    const report = await checkHealth(async () => { throw new Error("postgresql://user:secret@private-host/tutor"); });
    expect(report).toEqual({ status: "unavailable", checks: { database: false, vector: false, schema: false } });
    expect(JSON.stringify(report)).not.toContain("secret");
  });
});

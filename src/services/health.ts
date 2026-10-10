import { probeDatabase, type DatabaseReadiness } from "@/db/health";

export type HealthReport = {
  status: "ok" | "unavailable";
  checks: DatabaseReadiness;
};

export async function checkHealth(
  probe: () => Promise<DatabaseReadiness> = probeDatabase,
): Promise<HealthReport> {
  try {
    const checks = await probe();
    return { status: checks.database && checks.vector && checks.schema ? "ok" : "unavailable", checks };
  } catch {
    return { status: "unavailable", checks: { database: false, vector: false, schema: false } };
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "@/services/health";
import { GET } from "@/app/api/health/route";

vi.mock("@/services/health", () => ({ checkHealth: vi.fn() }));

describe("GET /api/health", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    { status: "ok" as const, http: 200, ready: true },
    { status: "unavailable" as const, http: 503, ready: false },
  ])("returns $http with fresh readiness information", async ({ status, http, ready }) => {
    const report = { status, checks: { database: ready, vector: ready, schema: ready } };
    vi.mocked(checkHealth).mockResolvedValue(report);
    const response = await GET();
    expect(response.status).toBe(http);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(report);
  });
});

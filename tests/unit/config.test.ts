import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/config/env";

const validEnvironment = {
  DATABASE_URL: "postgresql://fixture:fixture@localhost:5432/tutor_test",
  REDIS_URL: "redis://localhost:6379",
};

describe("environment validation", () => {
  it("provides the documented study defaults", () => {
    expect(parseEnvironment(validEnvironment)).toMatchObject({ NODE_ENV: "development", STUDY_TIMEZONE: "Asia/Kolkata" });
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: "https://localhost/database" },
    { DATABASE_URL: "postgresql://localhost" },
    { DATABASE_URL: "postgresql:missing-host" },
    { REDIS_URL: "https://localhost/redis" },
    { STUDY_TIMEZONE: "Not/A-Timezone" },
    { NODE_ENV: "staging" },
  ])("rejects invalid settings: %o", (override) => {
    expect(() => parseEnvironment({ ...validEnvironment, ...override })).toThrow("Invalid environment configuration");
  });

  it("does not leak rejected connection strings in validation errors", () => {
    const secretUrl = "https://user:private-password@example.com/database";
    let message = "";
    try { parseEnvironment({ ...validEnvironment, DATABASE_URL: secretUrl }); }
    catch (error) { message = (error as Error).message; }
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("private-password");
    expect(message).not.toContain("example.com");
  });
});

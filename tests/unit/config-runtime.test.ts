import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("configuration outside the test bundler", () => {
  it.each([
    { format: "module", load: 'import { getConfig } from "./src/config/index.ts";' },
    { format: "commonjs", load: 'const { getConfig } = require("./src/config/index.ts");' },
  ])("loads production configuration in a $format script", ({ format, load }) => {
    const output = execFileSync(process.execPath, [
      "--import", "tsx", `--input-type=${format}`, "--eval",
      `${load} console.log(getConfig().NODE_ENV);`,
    ], {
      encoding: "utf8",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://fixture:fixture@localhost:5432/tutor_test",
        REDIS_URL: "redis://localhost:6379",
      },
    });
    expect(output.trim()).toBe("production");
  });
});

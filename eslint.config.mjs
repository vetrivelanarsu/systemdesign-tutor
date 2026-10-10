import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts", "data/**", "private/**"]),
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts", "drizzle.config.ts"],
    ignores: ["src/config/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Read validated configuration through src/config." }
      ]
    }
  }
]);

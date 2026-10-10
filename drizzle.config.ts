import { defineConfig } from "drizzle-kit";
import { getConfig } from "./src/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: getConfig().DATABASE_URL },
  strict: true,
  verbose: false,
});

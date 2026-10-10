import * as nextEnvironment from "@next/env";
import { parseEnvironment, type AppConfig } from "./env";

// @next/env is CommonJS: native ESM and bundlers expose it differently.
const environmentModule = nextEnvironment as typeof nextEnvironment & {
  default?: typeof nextEnvironment;
};
const loadEnvironment = environmentModule.loadEnvConfig ?? environmentModule.default?.loadEnvConfig;

export function getConfig(): AppConfig {
  if (!loadEnvironment) throw new Error("Environment-file loader is unavailable.");
  loadEnvironment(process.cwd(), process.env.NODE_ENV !== "production");
  return parseEnvironment(process.env);
}

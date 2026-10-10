import { z } from "zod";

function hasProtocol(value: string, protocols: string[]): boolean {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url().refine((value) => hasProtocol(value, ["postgres:", "postgresql:"])
    && new URL(value).pathname.length > 1),
  REDIS_URL: z.url().refine((value) => hasProtocol(value, ["redis:", "rediss:"])),
  STUDY_TIMEZONE: z.string().default("Asia/Kolkata").refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function parseEnvironment(environment: Record<string, string | undefined>): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    // Never include rejected values: a connection URL may contain credentials.
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }
  return result.data;
}

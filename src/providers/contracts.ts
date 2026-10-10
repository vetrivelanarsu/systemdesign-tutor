import type { z } from "zod";

export type ModelIdentity = { provider: string; model: string; revision?: string };
export type ModelUsage = { inputTokens: number; outputTokens: number };

export interface GenerationProvider {
  readonly identity: ModelIdentity;
  readonly dataBoundary: "local" | "hosted";
  // Implementations load versioned files under /prompts and validate before returning.
  generate<T>(request: {
    promptId: string;
    promptVersion: string;
    variables: Record<string, unknown>;
    outputSchema: z.ZodType<T>;
    signal?: AbortSignal;
  }): Promise<{ output: T; usage: ModelUsage }>;
}

export interface EmbeddingProvider {
  readonly identity: ModelIdentity;
  readonly dataBoundary: "local" | "hosted";
  readonly dimensions: number;
  embed(texts: readonly string[], signal?: AbortSignal): Promise<number[][]>;
}

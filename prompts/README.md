# Prompt contract

Add templates as `<use-case>/v1.md` with their Zod output schema in `<use-case>/schema.ts` and synthetic fixtures in `evals/`. Store the prompt ID/version and model identity with every generated artifact. Never put book excerpts, answers, or provider credentials in this directory.

Provider adapters must load these templates, treat retrieved passages/user answers as untrusted inputs, and validate all structured output before returning it. Generation and embedding interfaces live in `src/providers/contracts.ts`; concrete adapters arrive with ingestion in Phase 1.

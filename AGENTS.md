# SystemDesign Tutor — agent guide

## Purpose
Build a local, single-user learning agent for system design and distributed systems.
Teach a JavaScript/TypeScript engineer through a prerequisite-based curriculum and cited book explanations.
Require daily reading, explain-back, and rubric-graded production scenarios before unlocking exploration.
Make architecture, tests, and evaluation strong enough to demonstrate in a portfolio; this is more than PDF chat.

## Stack and versions
- TypeScript throughout; Next.js App Router + Tailwind; Node.js route handlers and a separate worker.
- PostgreSQL + pgvector, Drizzle, BullMQ + Redis, Zod, Vitest; Docker Compose for local services.
- Swappable generation and embedding providers; Resend email, Telegram escalation, and self-hosted Langfuse.
- Use pnpm. During Phase 0, select mutually compatible stable releases and record exact versions. Pin Node in `.node-version`, pnpm in `packageManager`, direct dependencies without `^`/`~`, and container images by version and digest. Commit `pnpm-lock.yaml`; CI uses `--frozen-lockfile`. Record PostgreSQL and pgvector versions. Never use `latest` tags.
- Pin model identifiers/revisions where available; record provider, model, embedding dimension, and prompt version with results. Document aliases that cannot be pinned. Re-index when embedding models change.

## Structure (future directories are created with their feature)
```text
src/
  app/                 # UI and thin route handlers
  config/              # Validated environment configuration
  domain/              # Curriculum, grading, review, accountability rules
    session-machine.ts # Sole definition of states, guards, transitions
  services/            # Use cases: ingest, retrieve, teach, submit, report
  providers/           # Generation, embeddings, reranking, notifications
  db/                  # Drizzle schema and repositories
  workers/             # Durable scheduled jobs
prompts/               # Versioned prompt templates and output schemas
scripts/               # Local ingestion and maintenance entry points
drizzle/               # Reviewed database migrations
tests/                 # Unit, integration, and session access tests
evals/                 # Original/synthetic fixtures, runners, metric definitions
docs/                  # Architecture and evaluation reports
data/                  # Ignored PDFs, parsed text, caches, private eval data
```

## Commands
Phase 0 scripts are defined below. Start Docker and configure `.env` before migrations or integration tests. Use `corepack pnpm` if the pnpm shim is unavailable. Exact versions and setup are in README.md.

| Action | Command |
| --- | --- |
| Install | `pnpm install --frozen-lockfile` (initial setup: `pnpm install`) |
| Start services | `docker compose up -d --wait` |
| Run UI/API; production | `pnpm dev`; `pnpm build` then `pnpm start` |
| Test | `pnpm test`; `pnpm test:integration` |
| Lint; types; build | `pnpm lint`; `pnpm typecheck`; `pnpm build` |
| Generate; apply migrations | `pnpm db:generate`; `pnpm db:migrate` |

Future commands, **not implemented**: `pnpm worker:dev`, `pnpm ingest`, `pnpm eval:retrieval`, and `pnpm eval:grader`. Do not claim these work until their feature ships.

## Coding and safety rules
- Use TypeScript strict mode, small modules, explicit boundary types, and Zod-validated environment configuration. Read environment variables only through `src/config`.
- Keep business rules out of route handlers. Routes authenticate, validate, call services, and serialize; services enforce access regardless of entry point.
- Keep all prompts in versioned files under `/prompts`, never inline prompt strings. Put generation and embedding clients behind interfaces; keep SDK types out of domain code.
- Validate every parsed LLM output with Zod. Treat retrieved text and user answers as untrusted data. Invalid output, provider failure, or timeout cannot pass a session.
- Keep the session state machine in `src/domain/session-machine.ts`, with transition and access tests. Persist transitions atomically; use server time and idempotency to prevent replay/concurrent bypasses. UI hiding is insufficient.
- Every retrieval-backed answer needs resolvable book, chapter, and page citations. Preserve chunk provenance; abstain when evidence is insufficient. Never invent citations.
- Never commit book PDFs, extracted passages, embeddings, private traces, secrets, or database dumps. Ignore local corpus artifacts; ship original/synthetic fixtures and `.env.example` placeholders. Do not log source passages by default.
- Keep book content local by default. Hosted generation, embeddings, reranking, or tracing involving excerpts requires explicit user opt-in; follow the data boundary in PLAN.md.
- Do not expose answer keys, hidden clues, rubric internals, or model answers before the permitted reveal point. A reveal or give-up must not unlock the session.
- Accountability copy must connect actual commitments and learning gaps to prerequisite topics, hypothetical workplace consequences, and a specific AI engineering skill. Keep its prompt versioned and output schema-validated. Challenge skipped work directly; never invent peer progress, manager/colleague opinions, or inevitable humiliation. End with an achievable next action; tone controls must remain accessible while study is locked.

## Working style and definition of done
- Build one small vertical slice at a time against PLAN.md. Explain decisions briefly; ask before adding dependencies, including initial installation. Do not refactor unrelated code.
- For each implemented task: acceptance criteria met; relevant tests, lint, and type checks pass; docs and command instructions updated. Run the build for changes affecting it. Report any checks not run.
- Changes to retrieval, prompts, grading, or model versions require the relevant evaluation and a recorded comparison. Behavior affecting access needs server-side denial tests.
- For documentation-only tasks, check consistency and coverage; do not scaffold code or add dependencies merely to run checks.

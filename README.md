# SystemDesign Tutor

A local study engine for system design and distributed systems: learn from your books, explain ideas yourself, and earn progress through production scenarios. See [PLAN.md](PLAN.md) for the curriculum, daily study gates, AI engineering connections, and evaluation roadmap.

## What works now

Phase 0 provides a Next.js/Tailwind starter page, validated server configuration, PostgreSQL/pgvector and Redis containers, an initial Drizzle migration, database readiness checks, and automated checks. Book ingestion, model adapters, lessons, study gates, reminders, and the worker come in later phases. No model API keys or books are needed for this setup.

## Local setup

Requirements: Node **24.19.0**, pnpm **10.34.6**, and a running Docker-compatible engine with Docker Compose v2 or newer (`--wait` support). Use `.nvmrc`/`.node-version` to select Node. If `pnpm` is unavailable, run `corepack enable`, or substitute `corepack pnpm` for `pnpm` below.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d --wait
pnpm db:migrate
pnpm dev
```

Preserve an existing `.env` instead of copying over it. Open [the app](http://127.0.0.1:3000) and [database health](http://127.0.0.1:3000/api/health).

For the Colima profile created during initial setup on this Mac, use `colima start systemdesign-tutor` after a restart and select it with `docker context use colima-systemdesign-tutor` if needed. It uses 2 CPUs, 2 GiB RAM, a 20 GiB sparse data disk, and no host-directory mounts. `colima stop systemdesign-tutor` stops the VM when you finish. Other developers may use any compatible Docker runtime; [Colima's setup guide](https://github.com/abiosoft/colima#installation) documents the Homebrew option.

The app and database ports bind to localhost. The example credentials are for local development only; changing them requires updating `DATABASE_URL` as well. Docker volumes preserve data across container restarts. `docker compose down` stops the services without deleting their volumes. Changing the Postgres password in `.env` does not change a role in an existing volume.

Keep PDFs and derived book content under `data/` (gitignored), never under `public/`. No book content is shipped. Redis is prepared for the later worker; the Phase 0 app does not yet depend on Redis readiness.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development app |
| `pnpm build` / `pnpm start` | Build / serve the production app |
| `pnpm lint` | ESLint, including direct environment-access restrictions |
| `pnpm typecheck` | Generate route types and run strict TypeScript checks |
| `pnpm test` / `pnpm test:watch` | Unit checks / watch mode, without external services |
| `pnpm test:integration` | Apply migrations and check a real PostgreSQL/pgvector database |
| `pnpm db:generate` | Generate a migration after changing `src/db/schema.ts` |
| `pnpm db:migrate` | Apply checked-in migrations and initialize singleton settings |

Review generated SQL and commit both migrations and their Drizzle metadata. The first migration enables `vector` and creates `study_settings`; migrations must run with a database role permitted to install the extension. Re-running migrations preserves existing settings. `STUDY_TIMEZONE` initializes the settings row on the first run.

Integration checks use the configured `DATABASE_URL`, insert only synthetic/default settings, and never reset the database. Use a dedicated development/test database. They fail when Postgres is unavailable; they do not silently skip. CI creates disposable services from `compose.yaml`, applies migrations, runs all checks, builds, and probes the running production app. A hosted CI run starts once the repository is pushed to GitHub.

Initial verification: lint, strict types, 17 unit tests, four real-database integration tests, repeatable migrations, and the production build passed. The running homepage and readiness endpoint returned HTTP 200. Runtime configuration is checked in both native ESM and CommonJS scripts to catch loader differences hidden by test bundling.

## Readiness and troubleshooting

`GET /api/health` returns HTTP **200** with:

```json
{"status":"ok","checks":{"database":true,"vector":true,"schema":true}}
```

It returns **503** when the connection, vector extension, or initial schema is unavailable. Responses are uncached and omit credentials, connection strings, and database error messages. Connections and queries have bounded timeouts.

- `docker: command not found`: install/start a Docker-compatible runtime before the container and integration steps. Unit checks and builds work without it.
- Database check fails: check `docker compose ps` and the local `.env` credentials/port.
- Vector or schema check fails: run `pnpm db:migrate`; ensure the server image provides pgvector.
- Configuration errors name invalid fields, never their secret values. Next.js, migration scripts, and Drizzle use the same `src/config` validation and environment-file loading.

## Architecture and versions

Routes call services; services call repositories. `src/db` owns the connection pool, migrations, and schema. `src/providers/contracts.ts` defines generation/embedding boundaries; `prompts/README.md` defines the versioned prompt layout. Hosted providers and telemetry are not connected.

| Component | Pinned version |
| --- | --- |
| Node / pnpm | 24.19.0 / 10.34.6 |
| Next.js / React | 16.4.0 / 19.3.0 |
| TypeScript / Tailwind | 5.9.3 / 4.3.3 |
| Drizzle ORM / Kit | 0.45.4 / 0.31.11 |
| PostgreSQL / pgvector | 17.11 (`17.11-1.pgdg12+2`) / 0.8.7 |
| Redis | 8.2.2 |

Other direct dependencies are exact in `package.json`; transitive versions are locked in `pnpm-lock.yaml`. Images are pinned by tag and manifest digest in `compose.yaml`. TypeScript 5.9 remains the initial compatibility baseline; upgrades must pass the full checks.

Development and production builds explicitly use Next.js's supported Webpack mode. Turbopack's CSS worker could not bind its internal port in the initial environment; the Webpack build passed. This keeps the documented commands consistent with the verified build path.

ESLint is pinned to 9.39.5 because the React, import, and accessibility plugins bundled with the selected Next.js config do not declare ESLint 10 compatibility yet. npm marks ESLint 9 as unsupported; upgrade this lint stack together when those peers support 10. Drizzle Kit also currently includes two deprecated esbuild helper packages.

Setup references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind PostCSS setup](https://tailwindcss.com/docs/installation/using-postcss), [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new), and [pgvector Docker images](https://github.com/pgvector/pgvector#docker).

# SystemDesign Tutor — implementation plan

## Goals and non-goals
Build a daily learning engine for a frontend/full-stack engineer new to distributed systems: grounded explanations, a 60–90 day curriculum, enforced study, original production scenarios, and measurable progress. Demonstrate clean architecture and reproducible retrieval/grader evaluation.

Make the cost of postponing study concrete: missed commitments, gaps in technical discussions, harder later lessons, delayed personal milestones, and the AI engineering capabilities each topic unlocks.

Non-goals: multi-user SaaS, billing, public book hosting, multiple-choice quizzes, or committing copyrighted book content. Free chat is a reward after completing the daily workload.

## Assumptions
- Start with one local user and their legally obtained DDIA PDF. Default study timezone: `Asia/Kolkata`, configurable; store timestamps in UTC and study dates in that timezone. Remote access later requires authentication; even local use needs protected mutation endpoints.
- Use a 75-day baseline roadmap and a 45–60 minute daily target. Explanation level and scenario difficulty are separate settings. Begin with difficulty 1 while teaching the principal-level reasoning pattern.
- Node/Next.js route handlers suffice; a separate Node worker handles ingestion and scheduling. Choose Drizzle for explicit SQL/vector queries and BullMQ for retries and durable scheduling. No separate API framework initially.
- Phase 0 dependency and image versions are pinned in `package.json`, `pnpm-lock.yaml`, and `compose.yaml`; README.md records the baseline. AGENTS.md distinguishes implemented scripts from future commands. Model versions will be selected with their adapters.
- PDFs, extracted text, indexes, and private evaluation evidence stay on local storage. Default to local model adapters. Claude/OpenAI or other hosted providers may receive minimal excerpts only after explicit opt-in; an external API cannot satisfy a literal no-content-leaves-device policy. Default tracing is local and excludes passage/answer text. Reminders contain links and status only.
- Initial READ gate: eight minutes of server-accounted active reading plus two checkpoint responses. This measures participation, not attention. Explain-back requires topic-specific concepts and reasoning; similarity alone cannot prove copying.
- Scenario pass: at least **13/18**, with all six dimensions above zero. Allow three follow-up revisions after the initial answer. Exhaustion or giving up leads to remediation and a fresh scenario, never automatic passage.
- Missed days create debt. A normal day's required workload is today's lesson, up to one oldest debt lesson, and up to two due reviews. Excess debt/reviews remain queued; curriculum completion can extend beyond 90 calendar days. The workload is persisted when the session opens.
- Start with two streak freeze tokens per calendar month, no rollover. A freeze protects the streak but does not complete work or erase debt. Pausing reminders does not erase debt either.
- Use direct tough-love messaging for this user, with supportive/direct/off tone settings accessible even while locked. Turning motivational copy off does not bypass the study gate. Workplace examples are explicitly hypothetical; one missed day is recoverable and does not establish incompetence or predict how real people will behave.

## Architecture
```text
Browser: today's session; exploration unlocked only after PASSED
                  |
Next.js UI / thin API routes — authentication + input validation
                  |
Application services — daily access guard + domain rules
     |                |                     |
session machine   curriculum / SM-2    retrieval / generation / grader
     |                |                     |
     +-------- repositories -------- provider interfaces
                  |                     |          |
       PostgreSQL + pgvector      local models   hosted models (opt-in)
                  |
Local PDFs -> Node ingestion worker -> parse / section / embed / index

BullMQ + Redis -> Node worker -> commitments / debt / reminders / reports
                                  |                    |
                             Resend -> Whatsapp   local Langfuse
```
The database is authoritative; Redis is a job queue. Workers call the same domain services as routes. Recover due work after downtime, with idempotent jobs and a database record of intended deliveries. Providers support generation, embeddings, reranking, and notifications independently.

Ingestion preserves section boundaries, page spans, book edition, parser version, and checksums. Store PDF page numbers separately from optional printed-page labels. A citation resolves to a local source viewer with book, chapter/section, and page; missing structure requires a reviewed mapping rather than invented chapter labels. Mark diagrams/code that were not extracted faithfully. Phase 1 uses vector retrieval; Phase 6 adds PostgreSQL full-text keyword search, reciprocal-rank fusion, and a reranker. Keyword search satisfies the hybrid baseline; BM25 is a later dependency decision if evaluations justify it.

## Data model
All entities have stable IDs and audit timestamps; use foreign keys and appropriate unique constraints. Keep private answer keys and source content out of public API serializers.

| Table | Main fields / relationships |
| --- | --- |
| `books` | title, author, edition, local path, checksum, parser version, ingestion status |
| `chunks` | book ID, chapter, section, PDF page span, printed labels, text, checksum, embedding, embedding model/dimension, full-text search field |
| `topics` | slug, name, order, level objectives, estimated minutes, reviewed book/section mappings, AI engineering application and milestone mapping |
| `topic_prerequisites` | topic ID, prerequisite ID; unique pair, no self-links; reject graph cycles |
| `lessons` | topic ID, level, structured explanation, citations/chunk IDs, prompt/model versions |
| `topic_summaries` | topic ID, concise learning summary, misconceptions, originating passed session, version |
| `sessions` | unique study date, timezone snapshot, state, current item, retry target, state version, opened/read/passed timestamps, active reading seconds |
| `session_items` | session ID, topic/lesson/question IDs, kind (daily/debt/review), order, status, origin study date; completion ledger for debt |
| `questions` | topic, type, hook, hidden_clue, naive_answers, deeper_fix, tradeoffs, extreme_case, principle, source_chunk_ids, difficulty; also prompt body, real constraint, versions |
| `attempts` | session item/question ID, stage, round, answer, six scores, total, gap, re-read citation, follow-up, outcome, grader version; append-only |
| `review_schedule` | topic ID, ease factor, interval, repetition count, due date, last quality/attempt; one row per topic |
| `streaks` | current/best streak, last credited date, monthly freeze allowance and dated uses |
| `study_commitments` | study date, committed local time, timezone, recorded timestamp |
| `reminders` | study date, channel, escalation step, due/sent/cancelled times, status, idempotency key, delivery reference |
| `study_settings` | singleton user preferences: accountability tone, timezone, reminder preferences, personal AI engineering goals/milestones |
| `accountability_messages` | session/topic IDs, trigger, tone, validated message payload, supporting topic/chunk IDs, progress snapshot, prompt/model versions, displayed timestamp |

Persist checkpoint answers with attempts; book/chunk references use normalized join tables where referential integrity is needed. Store generation/grading configuration versions with artifacts so results remain reproducible. Weekly reports derive planned and completed work from commitments and the completion ledger.

## Daily session contract
`LOCKED -> READ -> EXPLAIN_BACK -> SCENARIO -> PASSED | RETRY`

- Opening today's session moves LOCKED to READ. READ accepts bounded heartbeat intervals using server time, stops credit after inactivity, and requires both checkpoints. Enforce this in one tested transition module.
- Explain-back checks coverage, causal reasoning, and concrete examples against a schema and rubric; reject vague responses with actionable feedback. Suspected copying triggers a targeted explanation request. Failure enters RETRY with `retry_target = EXPLAIN_BACK`.
- Scenario scoring is 0–3 each for `found_the_variable`, `measured_first`, `defined_requirements`, `tradeoffs`, `extreme_case`, and `generalized`. Vague/buzzword answers get 0–1; verbosity earns nothing. Application code computes totals and applies the pass rule.
- Every question has concrete numbers, a symptom/flawed assumption, one hidden clue, one real constraint, and an investigation/decision closing question. Types: incident, decision, failure, fairness, evolution, back-of-envelope, critique. Generate original questions from source concepts, never copied author posts.
- Expected reasoning: identify what grows, measure, define success, propose a naive and deeper fix, discuss trade-offs/extremes, and generalize. Difficulty: 1 single component; 2 two components; 3 full system with numbers; 4 multi-region/failure/cost/organizational constraints.
- Failed scenarios enter RETRY with `retry_target = SCENARIO`; feedback names the biggest gap, a cited section to re-read, and one weakest-point follow-up. Grade the complete revised answer. Provider/validation errors are retryable technical failures and do not consume an answer round.
- Keep answer keys server-side. Reveal the model answer after the final submitted revision, an explicit give-up, or passage. A failed/given-up revealed question requires a fresh question before credit. Opening, submitting, or revealing alone cannot unlock exploration.
- Each required item follows the stage loop; review items use a brief cited refresher. A passed item advances to READ for the next item; only completion of every required item transitions the session to PASSED.
- Guard free chat, topic browsing, lesson APIs, source access, and mutations on the server. While locked, allow today's assigned content/citations plus settings, privacy/reminder controls, and health endpoints. Midnight closes unfinished work into debt and creates the next day's gate. Server date checks apply even if the scheduler is late.
- Use transactions, optimistic state versions, and idempotency keys for submission/transition races. Never accept state or scores supplied by the browser.

## Tough-love accountability: the cost of skipping today
Use guilt about an unmet self-chosen commitment as a prompt to act. Make consequences specific to today's topic and recorded progress; keep criticism about the decision or knowledge gap. Never label the learner worthless, claim mistreatment is deserved, or invent what their manager or colleagues think.

Show a compact card before READ and on return after a missed commitment. Refresh it when progress changes, rather than repeating increasingly hostile messages. Weekly reports compare the learner with their own plan. Email/WhatsApp stays limited to private status and a link; workplace-pressure copy stays in the app and is never sent to coworkers or managers.

Each versioned, Zod-validated card contains:
1. **Commitment and gap:** what the learner planned, what remains unfinished, and the specific concept they cannot yet demonstrate. Do not claim a weakness without an assessment; say “not yet assessed” when appropriate.
2. **Later learning affected:** up to three dependent topics, with verified paths through `topic_prerequisites`. Explain precisely what becomes harder; distinguish a hard prerequisite from useful background. Do not claim that everything afterward becomes impossible.
3. **Workplace pressure:** a clearly labeled hypothetical design review or incident. Show a manager asking for evidence and a colleague challenging an unsupported answer; the learner might feel exposed, need help, or need another review before owning that decision. Do not predict humiliation, abuse, loss of respect, or job loss as facts.
4. **Personal opportunity cost:** name the user's delayed milestone and outstanding prerequisite work. Compare against their recorded plan, never invented peer achievements; show schedule movement only when the scheduler can calculate it.
5. **AI engineering payoff:** connect the concept to one concrete capability and a demonstrable task. Ground technical explanations in cited passages; label the AI application as a tutor-created example when the book does not discuss AI.
6. **Immediate action:** one achievable next step, such as opening today's section and answering the first checkpoint. Starting is progress; the existing gates still determine completion. After passage, name the capability earned rather than continuing the guilt message.

Illustrative direct-tone copy (production cards must resolve real topic links and citations):
> You committed to studying replication today, and the session is still unfinished. Postponing it leaves consistency trade-offs unpractised before the lessons that depend on them. Imagine a review where your manager asks, “How soon should an uploaded document appear in search?” and a colleague asks, “What happens if the query reaches a stale replica?” If you cannot explain the read path, you may need someone else to validate the design before you can own it. This is a concrete gap you can close. For AI engineering, today's payoff is reasoning about freshness in a RAG index. Open the assigned section and explain one stale-read failure case.

Seed topic mappings below are examples to review against the actual curriculum and source material; they are not automatic prerequisite edges.

| Topic | Later learning it supports | Concrete AI engineering application |
| --- | --- | --- |
| Networking | Timeouts, retries, service latency | Trace a slow RAG request across retrieval and inference; distinguish time to first token from total latency |
| Caching | Invalidation, freshness, load management | Design retrieval/response cache keys that account for corpus version and access scope; explain stale-answer risks |
| Replication | Consistency, failover | Explain why a newly indexed document may be missing from a replica and define a freshness target |
| Partitioning | Hotspots, rebalancing, distributed queries | Distribute a vector index and diagnose skewed tenant/query load |
| Transactions | Concurrency, atomic updates, recovery | Keep document version and ingestion status consistent; plan recovery when the index update is a separate step |
| Consensus | Leader election, coordination | Reason about failover for a distributed indexing coordinator without assuming two leaders can safely own the same work |
| Messaging | Retries, idempotency, backpressure | Build a durable ingestion/embedding pipeline that handles duplicate delivery without duplicate effects |
| Stream processing | Ordering, event time, incremental updates | Maintain index freshness from document-change events, including late or out-of-order updates |

## Phased roadmap
Check tasks only once implemented. Each phase ends with a usable slice and the definition of done in AGENTS.md.

### Phase 0 — reproducible foundation
- [x] Approve dependencies; pin versions; scaffold strict TypeScript, Next.js, Tailwind, Drizzle, and proposed scripts.
- [x] Add Docker Compose for PostgreSQL/pgvector and Redis, validated configuration, migrations, and `.env.example`.
- [x] Ignore books, extracted artifacts, private traces, and secrets; define provider contracts and prompt/schema layout.
- [x] Add Vitest, lint/type/build checks and CI using synthetic fixtures with no paid API requirement.

Acceptance: a fresh checkout can install, start services, migrate, and run a health check using documented commands; CI passes without books or API secrets.

Implementation validation: lint, strict types, 17 unit tests, four PostgreSQL/pgvector integration tests, repeatable migrations, and the Webpack production build pass locally. The running production homepage and database health endpoint both return HTTP 200; readiness was also verified as HTTP 503 before database initialization. Docker services run in a dedicated Colima profile. The GitHub Actions workflow is configured; a hosted run remains pending until this repo is pushed. Setup, version trade-offs, and service lifecycle commands are in README.md.

### Phase 1 — one book and cited retrieval
- [ ] Implement local PDF inspection, chapter mapping, chunking, embedding, and resumable/idempotent DDIA ingestion.
- [ ] Add vector search and a schema-validated Q&A service with resolvable citations and insufficient-evidence behavior.
- [ ] Add a minimal local reader/Q&A screen, prompt versions, and metadata-only tracing.
- [ ] Create the retrieval baseline and inspect ten representative pages including code, tables, and diagrams.

Acceptance: re-ingestion creates no duplicate chunks; five representative questions return supported book/chapter/page citations; an unsupported query abstains; extraction defects are visible. Capture baseline metrics. Q&A is a development slice; Phase 3 gates it before normal use.

### Phase 2 — curriculum and daily teaching
- [ ] Define a reviewed 75-day DAG: networking → caching → replication → partitioning → transactions → consensus → messaging → stream processing, with prerequisite edges adjusted by topic.
- [ ] Map topics to the user's editions/chapters; mark unavailable sources rather than fabricate mappings.
- [ ] Select the next eligible topic using completion and weakness, with a deterministic fallback.
- [ ] Generate cited beginner/intermediate/advanced lessons: intuition → mechanism → trade-offs → failure cases; beginner uses JavaScript/Node analogies.
- [ ] Map each topic to downstream prerequisites, a hypothetical workplace challenge, and a concrete AI engineering capability; generate the cited “why today matters” card.

Acceptance: cycles and unavailable prerequisites are rejected; completed topics are tracked; three levels of one topic share grounded claims with distinct depth. Missing books do not block topics supported by DDIA. Accountability cards use valid dependency paths and distinguish source-backed explanations from illustrative AI applications.

### Phase 3 — enforced learning and calibrated grading
- [ ] Implement the transactional session machine, server access guard, midnight behavior, reading timer, and checkpoints.
- [ ] Add explain-back checks and feedback; generate schema-validated original scenarios across the seven types/four difficulties.
- [ ] Implement six-dimension grading, server-calculated pass/fail, three revisions, and protected model-answer reveal.
- [ ] Author the grader evaluation set; test weak/strong answers, score boundaries, copied/vague summaries, prompt injection, replay, and concurrent requests.
- [ ] Show direct/supportive accountability cards before READ; keep tone/off controls available while locked and separate from pass/fail logic.

Acceptance: direct API calls cannot bypass any stage; debt items must pass before unlock; technical failures never pass or spend revision budget; all six rubric scores persist; model answers remain inaccessible before reveal eligibility. Grader meets the evaluation targets below on the held-out set. Tone changes neither alter grades nor unlock study, and a failed card generation uses a reviewed factual template without blocking READ.

### Phase 4 — progress, memory, and review
- [ ] Store passed-topic summaries and misconceptions; link new lessons to real prior study dates (for example, replication lag from Day 6).
- [ ] Add progress/weakness views and item-level completion/debt tracking; show full history after daily passage.
- [ ] Implement SM-2 with a documented outcome-to-quality mapping; update it once per completed assessment.
- [ ] Generate fresh review scenarios with changed constraints; add a weekly classic design drill critiqued against cited book material.

Acceptance: summaries only reference completed work; time-controlled tests verify SM-2 due dates and failure resets; reviews change constraints; a weekly URL-shortener drill yields cited critique and rubric feedback. Drill replaces that day's main lesson to bound workload.

### Phase 5 — accountability over time
- [ ] Add restart-safe scheduling, missed-day reconciliation, bounded debt assignment, and streak/freeze accounting.
- [ ] Prompt nightly at 20:30 local time for tomorrow's commitment; default to 19:00 next day if unanswered, visibly marked as a default.
- [ ] Send email at committed time, Whatsapp after 30 minutes, and one final Whatsapp after 90 minutes; stop on open, pause, or quiet hours (22:00–08:00). These are configurable defaults.
- [ ] Add weekly planned-versus-completed reports, debt and weak-topic summaries, delivery retries, deduplication, and notification preferences.
- [ ] Refresh accountability cards from missed commitments and assessed gaps; show delayed personal milestones in weekly reports and acknowledge recovery after completion.

Acceptance: simulated missed days, month boundaries, timezone changes, duplicate jobs, and downtime preserve debt/streak correctness; session opening cancels pending escalation and send-time checks catch races. A retry never knowingly duplicates a recorded successful delivery; uncertain external delivery is recorded for reconciliation.

### Phase 6 — retrieval quality and portfolio finish
- [ ] Add keyword/vector fusion and reranking behind a configurable interface; compare against the Phase 1 baseline.
- [ ] Build an evaluation dashboard for retrieval, grading, latency, token use, and cost, with private text redacted.
- [ ] Polish accessible session UX, error recovery, local citation viewing, and settings; run an end-to-end study/week simulation.
- [ ] Publish architecture/operating instructions, limitations, measured results, and a reproducible demo using original/synthetic documents only.

Acceptance: matched-corpus evaluation meets retrieval targets below, reports quality/cost changes for fusion and reranking, and reproduces from pinned configuration. README clearly distinguishes measured results from targets; the demo/repo contains no private book content.

## Retrieval and grader evaluation
Keep versioned dataset definitions, scoring scripts, seed/configuration, prompt/model/index versions, and run summaries. Public fixtures must be original or synthetic; book-derived questions, passages, answers, and annotations remain gitignored. Use deterministic fixtures in CI and explicitly initiated live-model evaluations for quality/cost comparisons.

- **Retrieval set:** start with 50 manually labeled questions spanning definitions, cross-chapter trade-offs, failure cases, and unsupported requests. Label relevant chunk IDs/page spans and answerable status. Reserve 20 questions as a held-out test set; tune only on the rest.
- **Retrieval measures:** Recall@5, MRR@10, citation resolution, human-reviewed claim support, unsupported-query abstention, p50/p95 latency, and per-answer token/cost totals. Compare vector-only, hybrid, and hybrid + reranker on identical queries, corpus, and chunking.
- **Initial retrieval targets:** Recall@5 ≥ 0.80; ≥ 0.90 of sampled factual claims supported by their cited passages; all emitted citations resolve; abstention on ≥ 0.90 of unsupported cases. Always report counts, especially for small unsupported subsets; baseline failures are work to improve, not results to hide.
- **Grader set:** hand-write 20 original scenarios with four answer variants each (80 answers): strong, partly correct, verbose/buzzword, and a plausible answer missing a crucial dimension. Cover all question types and difficulties; add adversarial instructions and give-up/reveal cases to functional tests. Label each dimension 0–3 with a rationale before running the grader.
- **Grader split/measures:** hold out whole scenarios (six scenarios / 24 answers), not variants from the same scenario. Measure false-pass rate on human-fail answers, false-fail rate, per-dimension mean absolute error, weighted agreement, and pass/fail consistency across three runs. Initial targets: false-pass ≤ 5%, false-fail ≤ 15%, mean absolute error ≤ 0.5; zero rubric dimensions always prevent passage. Report numerator/denominator and uncertainty; expand the set before stronger claims.
- **Human calibration:** author reviews all labels; an optional second reviewer independently scores a subset, with disagreements reconciled. Solo labels are explicitly a limitation. Freeze labels before prompt tuning; keep a regression subset for each discovered failure.
- **Resume evidence:** retain a table of baseline versus hybrid/reranked quality and latency, grader calibration results, dataset sizes, and reproducible commands. Describe only measured improvements; show server-gating tests and a synthetic demo alongside results.
- **Accountability evaluation:** review fixtures for an unassessed topic, one missed day, repeated misses, failed attempts, recovery, and supportive/off settings. Require accurate commitments and dependency paths, a relevant AI task, a next action, and no invented social judgments. Track session starts/completions, return after a miss, and the user's helpfulness/pressure feedback; a single-user pilot cannot establish that guilt causes better learning.

## Risks and mitigations
| Risk | Mitigation |
| --- | --- |
| Lenient or inconsistent grader | Anchored rubric, human-labeled variants, repeated runs, false-pass release target, deterministic pass logic; rubric/prompt versioning |
| Broken diagrams/code/tables | Inspect representative pages, flag extraction limitations, show original local page; add OCR/vision only after measuring need and approving a dependency/data boundary |
| Weak retrieval or false citations | Reviewed chapter mapping, labeled retrieval set, abstention, fusion/reranking ablations, claim-support review |
| Cost and latency | Cache by source/prompt/model versions, reuse embeddings, bound retrieved context/output/retries, configurable daily call/token budgets; disclose unavailable actual cost for local runs |
| Provider outage or exhausted budget | Persist progress, return a recoverable error, reschedule fairly; never fabricate grades or unlock |
| Prompt injection or answer leakage | Treat book/user text as data, validate output, keep answer keys private, enforce transitions outside the LLM |
| Overwhelming debt or timer gaming | Bound daily debt/reviews, preserve remaining debt visibly, require explain-back/scenario evidence; make no claim to prove attention |
| Duplicate reminders or source exposure | Durable idempotency records, send-time cancellation checks, quiet hours, minimal notification text, local/redacted traces |
| Pressure creates avoidance or misleading career fears | Adjustable/off tone, factual personal progress, labeled hypothetical workplace situations, bounded display frequency, recovery actions, and user feedback |

## Open questions for the owner
Defaults above allow implementation planning to continue; resolve these before the relevant integration.
- Must all content remain on-device, or may minimal excerpts reach Claude/OpenAI? What hardware, preferred models, and monthly budget are available?
- Which book editions/PDF formats are available, and are scanned pages common?
- Should daily duration, 13/18 pass threshold, debt cap, and freeze allowance change after a one-week pilot?
- Confirm timezone, preferred commitment time, email/Whatsapp channels, and escalation/quiet-hour defaults.
- Will the app remain localhost-only or need authenticated access from another device? Can a second reviewer help calibrate the grader?

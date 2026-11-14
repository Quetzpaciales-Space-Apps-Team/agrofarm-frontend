# AGENTS.md: Project Plan and Working Rules for `agrofarm-frontend`

**Everything in this repository is written in English. This is the highest priority rule and it overrides any other instruction.** See rule G1.

This repository holds one service: `frontend` (React + Vite).

---

## 0. How to use this document

- Agents: read Part A (global rules) and Part B (frontend rules) fully before touching code. Then read only the issue you were given (Part D lists them).
- Humans: send tasks to agents as GitHub issues using the template in Part E. One task, one branch, one pull request.
- If a rule here conflicts with a task description, stop and ask. Do not guess.

## 1. Product context

We are building a simulator that predicts how crops will grow under given weather, soil and global climate conditions (for example El Nino and La Nina), and recommends crop rotation actions. The UI is made of **interactive maps**. A farmer uploads data about a specific farm and gets recommendations.

Product requirements the frontend must satisfy:

1. Interactive maps with layers, a timeline and overlays (rainfall, soil moisture, vegetation index, soil properties, slope and erosion risk, frost-prone zones, water stress).
2. Scenario controls: sliders that change rainfall and temperature, and a selector for the ENSO phase (El Nino, La Nina, neutral). Results always show an uncertainty range.
3. A comparison of **at least three rotation strategies, including the farm's current rotation**. For each strategy show: why it was suggested, the evidence behind it, the expected benefits, the information gaps, and the risks that need local review.
4. Farmer inputs: priorities (water use, income, soil structure, forage value, nitrogen fixing, erosion reduction, market suitability) and constraints (water availability, equipment).
5. Highlight times when fields are typically bare and seasons when the current crops look vulnerable.
6. Farmer-centered design: plain language, glossary tooltips, usable by people with little technical or geospatial experience.
7. The tool **supports** farmers and local experts. It never replaces them. A visible disclaimer and clear "needs local review" markers are mandatory.

---

# PART A: Global rules (identical in every repository)

The canonical copy of Part A lives in `agrofarm-docs/AGENTS.md`. Change it there first, then copy the same text to the other three repositories the same day.

## G1. Language: English first

- All code identifiers, comments, commit messages, branch names, PR titles and descriptions, issues, documentation, API fields, dataset and column names, log messages, error messages and **UI copy** are in English.
- Spanish exists only as an i18n catalog in `agrofarm-frontend`, added in the final phase. It never appears in source code, tests, commits or docs.
- Team source documents written in Spanish stay outside the repositories. Their English versions live in `agrofarm-docs`.
- Chatting with humans in Spanish is fine. Nothing produced in a repo is in Spanish.

## G2. Test-driven development (mandatory)

1. **Red:** write a failing test for the behavior. Run it. Confirm it fails for the right reason.
2. **Green:** write the smallest code that makes it pass.
3. **Refactor:** clean up with all tests green.

- Bug fix: first write a regression test that reproduces the bug.
- Prefer separate commits: `test: ...` first, then `feat: ...` or `fix: ...`.
- Never delete, skip or weaken a test to make a change pass. If a test is wrong, explain why in the PR.
- CI enforces at least 80% line coverage on changed code.

## G3. CI/CD (mandatory)

- GitHub Actions. Every pull request runs: lint, type check, unit tests, integration tests, Docker image build, vulnerability scan.
- **A pull request merges only when every check is green.** The single required status check is the job named `ci-gate`. It depends on every other job and fails if any of them failed or was cancelled. Keep that job name stable. New jobs are added to its `needs` list.
- `develop` and `main` are always green and always deployable.
- Merge to `develop` deploys to **staging** automatically. Merge to `main` deploys to **production** after a manual approval.
- No manual deploys. The pipeline is code in the repo. Rollback means redeploying the previous image tag.
- Authenticate to GCP from CI with Workload Identity Federation. Never store service account JSON keys.

### G3.1 Test scope: full suite first, touched modules when it gets slow

- Default: every pull request runs the **full** test suite of the repo.
- When the pull request pipeline gets too slow (median above 10 minutes over the last 20 runs), switch pull requests to **affected-only** mode: run only the tests of the modules the change touches.
  - Detect touched modules with path filters in the workflow.
  - Inside a module, select tests by changed files (for example `vitest --changed origin/develop`, or one pytest path per package).
- Safeguards that always apply in affected-only mode:
  1. A change to shared files runs everything: lockfiles, CI workflows, Dockerfiles, root configuration, the OpenAPI contract, database migrations, shared test setup.
  2. The full suite always runs on every push to `develop`, on every release pull request into `main`, and nightly.
  3. `ci-gate` treats a skipped job as passed and a failed or cancelled job as failed, so path filters never block or bypass the required check.
- Turning on affected-only mode is its own pull request and states the measured timings.
- Slow tests are never fixed by deleting, skipping or weakening tests (rule G2).

## G4. Docker (mandatory)

- Every repo that ships a service has a multi-stage `Dockerfile` (pinned base image versions, non-root user, healthcheck) and a `docker-compose.yml` for local development.
- `docker compose up` must give a working local environment.
- Configuration comes from environment variables. Commit `.env.example`. Never commit `.env`.
- Standard Makefile targets in every repo: `make dev`, `make test`, `make lint`, `make typecheck`, `make build`, `make check` (lint + typecheck + test).

## G5. Microservices

Four repositories. Every service is deployable alone.

| Repo | Service(s) | Responsibility |
|---|---|---|
| `agrofarm-frontend` | `frontend` | React + Vite single page app (maps, simulation UI) |
| `agrofarm-api` | `core-api` | Public REST API: auth, farms, uploads, search, orchestration. Owns PostgreSQL. |
| `agrofarm-analytic` | `ml-service` | Internal service: crop simulation model, uncertainty, rotation scoring |
| `agrofarm-analytic` | `data-service` | Data pipelines: ingestion, cleaning, harmonization of weather, soil and satellite data |
| `agrofarm-docs` | none | Team plan, dataset catalog, ADRs, operations runbook, decisions and non-code tasks |

- Services talk only through HTTP contracts defined in OpenAPI. No shared code between services, including the two services inside `agrofarm-analytic`.
- No reaching into another service's storage. The one published data contract is the `clean/` datasets that `data-service` writes with a manifest: other services read them read-only, by manifest version.
- Only `core-api` talks to PostgreSQL.
- Contract first: change the OpenAPI file, then tests, then code.

## G6. Cloud: GCP

Cloud Run (services and jobs), Cloud SQL for PostgreSQL, Artifact Registry, Secret Manager, Cloud Storage. Document every manual cloud step in `docs/ops.md` of `agrofarm-docs`.

## G7. Security baseline

- No secrets in git, logs, tests or screenshots. Use Secret Manager and env vars.
- Validate all input at the boundary. Never trust the client.
- Least privilege for every credential and service account.
- Dependencies are pinned by lockfile and scanned in CI.

## G8. Git workflow

- Two long-lived branches: `develop` (integration, default branch, deploys to staging) and `main` (production releases).
- Work happens on short-lived branches cut from `develop`: `feat/<task-id>-<slug>`, `fix/...`, `chore/...`, `docs/...`, `test/...`, `refactor/...`, `ci/...`.
- **Every change reaches `develop` through a pull request. Pull requests from work branches target `develop` only, never `main`.**
- `main` only receives release pull requests from `develop`. An urgent production fix uses a `hotfix/...` branch cut from `main`, with a pull request into `main` and a second one back into `develop`.
- No direct pushes and no force pushes to `develop` or `main`.
- Conventional Commits. Squash merge into `develop`. Release pull requests into `main` use a merge commit so the two branches do not diverge.
- Small pull requests (aim for under 400 changed lines).
- A human reviews and merges. **Agents never push to `develop` or `main` and never merge their own PR.**

## G9. Rules for agents

1. Read this file and the README first.
2. Take only issues labeled `agent-ready`. Issues labeled `needs-human` are decisions or account work for people.
3. One task per branch and per PR. Stay inside the scope of the task. The PR targets `develop` and says `Closes #<issue>`.
4. Ambiguous requirement: ask. Do not guess silently.
5. No new dependency without a one-line justification in the PR description.
6. Run `make check` before saying the work is done.
7. Never run destructive commands (force push, dropping databases, deleting outside the workspace).
8. Update docs and the OpenAPI file together with the code.
9. In the final message report: what was done, what was not done, what you could not verify.

## G10. Domain safety

Recommendations are decision support. Every recommendation, in the API and in the UI, must carry reasons, evidence, data gaps, risks and uncertainty. Never present model output as certain. Never remove the disclaimer.

## G11. AI use traceability

The NASA Space Apps submission rules require that we say where and how AI tools were used, in descriptive text and in metadata. Every agent and every person who uses an AI tool leaves this trace. No trace, no merge.

1. **Commit metadata.** Every commit written with AI help ends with one trailer per tool:
   `Assisted-by: <tool> (<model id>)`, for example `Assisted-by: Claude Code (claude-fable-5-2)`.
   A commit written without AI has no trailer. Never add the trailer to work the tool did not touch, and never leave it out.
2. **Pull request text.** Every pull request fills the "AI use" section of the template: the tool and model, what it was used for (code, tests, docs, review, data analysis, translation), what it was **not** used for, and which person reviewed the output. "None" is a valid answer only if it is true. A squash merge keeps the `Assisted-by` trailers in the final commit message.
3. **Repository text.** `AI_USAGE.md` at the root of each repo is the public statement: the tools the team used in this repo, for what, and how to list the AI-assisted commits and pull requests. The README links to it. Whoever uses a tool that is not listed there adds it in the same pull request.
4. **Generated files.** A file that is mostly AI output and is not source code (a dataset, a table of crop traits, a long text) says so in its first lines or in its manifest (`generated_by`, `reviewed_by`).
5. **Media.** AI-generated images and videos carry a visible watermark ("AI-generated"). AI-generated audio is acknowledged in the text next to it and in the file metadata. No NASA logo, flag or mission identifier in generated content.
6. **Limits.** AI tools speed up the work. They do not choose the idea of the solution, and a person on the team reviews everything that is merged (rule G8). Never paste secrets, credentials or personal data into an AI tool.
7. **Machine learning inside the product** is not covered by this rule. It is documented by the model card and the provenance fields (rule G10).

## G12. Public access for judges

- Every link in the submission opens in a private browser window with no password, no permission request and no registration. This includes the repositories, the demo and the live application.
- The live application has an entry that works without login (a public demo mode with example data). Login stays available for real farm data and is never the only way in.
- Credentials, including demo credentials, are never written in documentation, slides or the submission form.

---

# PART B: Frontend rules

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | React + Vite + TypeScript (`strict: true`) |
| Routing | React Router |
| Server state | TanStack Query |
| Client state | Zustand (only for state that is not server data) |
| Maps | MapLibre GL JS (open source, no vendor token) |
| Charts | Recharts |
| UI | Tailwind CSS + Radix UI primitives (accessible by default) |
| Forms | React Hook Form + Zod |
| i18n | i18next + react-i18next |
| API types | `openapi-typescript`, generated from the `core-api` OpenAPI file |
| Unit and component tests | Vitest + React Testing Library + user-event |
| API mocking | MSW (Mock Service Worker) |
| End-to-end tests | Playwright + axe |
| Lint | ESLint + Prettier + `eslint-plugin-boundaries` + `eslint-plugin-i18next` |

Use the current stable version of each tool at project start. Lockfile is committed. Adding a library outside this table needs a justification in the PR.

## 3. Architecture: layers with a backend middleware chain

Four layers. A layer may import only from the layers below it.

```
Presentation   app/, pages/, features/*/components, components/
Application    features/*/hooks, features/*/state, services/
Domain         domain/            (pure TypeScript: no React, no I/O)
Infrastructure infrastructure/    (HTTP client, storage, map adapters)
```

```
src/
  app/              providers, router, app shell
  pages/            route screens, compose features, no business logic
  features/
    auth/ farms/ map/ simulation/ rotations/ search/
      components/ hooks/ state/ __tests__/
  components/       shared presentational UI
  domain/           types and pure functions (units, scales, scenario math)
  services/         use cases that orchestrate API + domain
  infrastructure/
    api/            http client, middleware chain, generated types
    storage/        wrappers for browser storage
    map/            MapLibre adapter
  i18n/             en/ now, es/ in the final phase
  test/             setup, MSW handlers, factories
```

Rules:

1. `domain/` imports nothing from React, the network or the DOM. Most TDD happens here first.
2. `infrastructure/api` is the **only** place that calls `fetch`. Components never call `fetch`.
3. Layer boundaries are enforced by lint. A "boundary canary" test proves the rule fails on a bad import.
4. Map code sits behind a `MapAdapter` interface. Tests use a fake adapter. Do not test MapLibre rendering in unit tests.
5. Components render. Hooks coordinate. Services decide. Domain computes.

### 3.1 API client middleware

The client is `compose(...middlewares)(fetch)`. Order matters:

1. `requestId`: adds `X-Request-Id`.
2. `locale`: adds `Accept-Language`.
3. `auth`: attaches the in-memory access token.
4. `timeout`: aborts slow calls.
5. `retry`: only for idempotent `GET`, with backoff and a low limit.
6. `refreshOn401`: one single-flight refresh, then replay the request once.
7. `errorNormalizer`: turns anything into `ApiError { code, message, status, details, requestId }`.
8. `logger`: development only. Never log tokens, passwords or personal data.

Each middleware has its own unit tests. Components and hooks only ever see `ApiError`, never raw HTTP errors.

### 3.2 Mock-first development

The app must run without the backend. Runtime config (`/config.json`) has `apiBaseUrl` and `useMocks`. MSW handlers are typed from the generated OpenAPI types. When the contract changes, regenerate the types and CI fails if the generated file is stale.

## 4. Authentication in the browser

- Registration and login forms validate with Zod rules that mirror the backend rules.
- The access token lives **in memory only**. Never `localStorage`, never `sessionStorage`. A test asserts this.
- The refresh token is an httpOnly, Secure, SameSite cookie set by `core-api`. The client uses `credentials: 'include'`.
- On app start call `POST /v1/auth/refresh` to restore the session.
- `<RequireAuth>` protects routes. A 401 that cannot be refreshed sends the user to login and keeps the return path.
- Logout calls the API, clears the query cache and the in-memory token.
- Login failure shows one generic message. Never reveal whether the email exists.
- Frontend and API must be served under the same registrable domain so the cookie works. Record the chosen domains in `docs/ops.md`.

## 5. Maps, simulation and recommendation UI

- Base map with pan and zoom. Draw, edit and import a farm polygon (GeoJSON). Show area.
- Layer panel: toggle, opacity, legend, and a source block for each layer (source, resolution, date range, and a note on satellite versus ground measurements).
- Compare two layers (swipe or side by side).
- Timeline slider (monthly and seasonal steps). ENSO phases shown as a band on the timeline. Bare-field periods and vulnerable seasons highlighted.
- Scenario panel: sliders for rainfall change (%) and temperature change (degrees C), and an ENSO phase selector. Show baseline versus scenario with an uncertainty band. Debounce calls. Reset and save scenario.
- Farm data upload wizard: template download, client-side parsing and validation preview, row-level errors, progress, summary.
- Priorities and constraints form, saved per farm.
- Rotation comparison: three or more strategies including the current one, side by side, with the five required blocks (why, evidence, benefits, gaps, risks) and a score breakdown per farmer priority. Mark items that need local expert review.
- Glossary tooltips for evapotranspiration, NDVI, soil moisture anomaly, frost risk and water balance.
- A visible disclaimer that the tool supports and does not replace local expertise.

## 6. UX and quality rules

- Plain language. No unexplained jargon.
- Always show units (mm, degrees C, %).
- Every async view has loading, empty and error states.
- WCAG 2.1 AA: keyboard navigation, focus visibility, contrast, labels. axe runs in CI.
- Risk maps use color-blind-safe palettes. Never rely on red versus green alone.
- Responsive, mobile first.
- Performance budget enforced in CI. The map and charts are lazy loaded. Start with: main bundle at most 250 kB gzipped.

## 7. Testing rules (TDD applied)

| Level | Tool | What |
|---|---|---|
| Unit | Vitest | `domain/` functions, middlewares, services |
| Component | RTL + user-event | Behavior through roles and labels, not implementation details |
| API layer | MSW | Success, error, 401 refresh, timeout |
| Accessibility | axe | Every page, in component and e2e tests |
| End to end | Playwright | Register, draw farm, upload data, run scenario, compare rotations |

- Query by role and accessible name. Avoid test ids unless nothing else works.
- No snapshot tests for large trees.
- Every middleware, every `domain/` function and every form has tests written first.

## 8. Internationalization (English first, Spanish last)

- From day one: i18next is set up with an **English catalog only**. No string literals in JSX (enforced by `i18next/no-literal-string`). This keeps the later Spanish port cheap.
- Keys: `feature.component.element`. Use `Intl` for numbers and dates. Use ICU plurals.
- English is the source of truth.
- Spanish catalog, language switcher and `Accept-Language` support are added in the final phase (F6). A test checks that every English key exists in Spanish.

## 9. CI/CD and Docker for the frontend

- Dockerfile: Node build stage, then `nginx-unprivileged` serving static files. SPA fallback and security headers (CSP, no framing, no sniffing).
- Runtime config: the container writes `/config.json` from env vars at start, so one image works in every environment.
- Workflow on pull request: install with frozen lockfile, lint, typecheck, test with coverage gate, build, bundle size check, image build, Trivy scan, Playwright.
- Workflow on `develop`: push the image to Artifact Registry (tag with the commit SHA) and deploy to Cloud Run staging.
- Workflow on `main`: deploy the same image to production after manual approval. Never rebuild for production.
- Every job is in the `needs` list of `ci-gate`. Test scope follows rule G3.1.

---

# PART C: Dependencies on other repos

| Need | From | Until it exists |
|---|---|---|
| `openapi.yaml` | `core-api` | Use the stub file checked into `docs/contract/` and MSW |
| Layer metadata and tile URLs | `core-api` (fed by `data-service`) | Use fixture layers in `src/test` |
| Simulation and rotation results | `core-api` (calls `ml-service`) | Use fixtures with realistic uncertainty ranges |

---

# PART D: Phased plan and tasks

Project phases (0 to 4) come from the team plan in `agrofarm-docs` (`docs/plan/project-plan.md`). Each task is a GitHub issue with the same ID in its title. Each task has acceptance criteria that must be tests.

## F0. Foundation (project phase 0)

- [ ] **FE-000** Screen wireframes approved by the team (map, layer panel, timeline, strategy comparison, upload). *Needs a human.*
- [ ] **FE-001** Scaffold Vite + React + TypeScript strict, ESLint, Prettier, Vitest, RTL, Makefile targets. *AC: `make check` passes with one smoke test. `make dev` serves the app.*
- [ ] **FE-002** Layer boundaries lint and canary test. *AC: a deliberate bad import fails lint in CI.*
- [ ] **FE-003** Dockerfile and compose. *AC: `docker compose up` serves the app. Container runs as non-root. Healthcheck passes.*
- [ ] **FE-004** GitHub Actions CI. *AC: PR runs lint, typecheck, coverage gate, build, bundle check, image build, Trivy.*
- [ ] **FE-005** i18n scaffold with English catalog and the no-literal-string rule. *AC: lint fails on hardcoded JSX text.*
- [ ] **FE-006** Generated API types and typed MSW handlers from the contract. *AC: `make types` regenerates. CI fails if the generated file is stale.*
- [ ] **FE-007** CD to Cloud Run staging with Workload Identity Federation. *AC: merge to `develop` deploys to staging. Merge to `main` deploys to production after approval. Rollback steps documented.*

## F1. API client, auth, app shell (project phases 1 and 2)

- [ ] **FE-101** Middleware chain from section 3.1. *AC: unit tests per middleware, including single-flight refresh.*
- [ ] **FE-102** `ApiError` normalization. *AC: network, timeout, 4xx and 5xx map to stable error codes.*
- [ ] **FE-103** Registration page. *AC: client validation, backend field errors shown on the right fields.*
- [ ] **FE-104** Login page and session restore. *AC: reload with a valid cookie keeps the user logged in. Token never in web storage.*
- [ ] **FE-105** `<RequireAuth>` and logout. *AC: protected route redirects and returns after login. Logout clears cache.*
- [ ] **FE-106** App shell with navigation, error boundary, 404, loading and empty patterns, disclaimer footer. *AC: axe passes.*
- [ ] **FE-107** Farm list, create and delete. *AC: works against MSW and against the stub contract.*

## F2. Map core (project phase 2)

- [ ] **FE-201** `MapAdapter` interface, MapLibre implementation and a fake. *AC: feature tests run with the fake only.*
- [ ] **FE-202** Draw, edit, import and export a farm polygon. *AC: invalid GeoJSON is rejected with a clear message. Area shown in hectares.*
- [ ] **FE-203** Layer panel from `/v1/layers`. *AC: toggle, opacity, legend, source block.*
- [ ] **FE-204** Render raster layers from signed URLs with loading and error states. *AC: failed tile load shows a message and does not crash.*
- [ ] **FE-205** Color-blind-safe scales and a shared legend component. *AC: palettes pass a contrast check test.*

## F3. Time and scenarios (project phase 3)

- [ ] **FE-301** Timeline slider that drives the visible layers. *AC: keyboard operable.*
- [ ] **FE-302** ENSO band on the timeline. *AC: El Nino, La Nina and neutral are distinguishable without color alone.*
- [ ] **FE-303** Bare-field periods and vulnerable seasons highlights from the farm insights endpoint.
- [ ] **FE-304** Scenario panel with sliders, baseline versus scenario chart, uncertainty band, reset and save. *AC: calls are debounced. Uncertainty is always visible.*
- [ ] **FE-305** Layer comparison (swipe or side by side).
- [ ] **FE-306** Provenance component (model version, data range, source).

## F4. Farm data and recommendations (project phase 3)

- [ ] **FE-401** Upload wizard: template, parse, validate, preview, row errors, progress, summary.
- [ ] **FE-402** Priorities and constraints form saved per farm.
- [ ] **FE-403** Rotation comparison view with at least three strategies and the five required blocks. *AC: a strategy without gaps and risks cannot render. A test enforces it.*
- [ ] **FE-404** Strategy detail drawer with evidence links and glossary tooltips.
- [ ] **FE-405** Printable summary to share with an agronomist (print stylesheet). Optional.

## F5. Search and polish (project phase 4)

- [ ] **FE-501** Search for crops, places and farms using `/v1/search` (typo tolerant on the backend). *AC: debounced, highlights matches.*
- [ ] **FE-502** Accessibility pass with axe in CI plus a keyboard walkthrough.
- [ ] **FE-503** Code splitting and bundle budget.
- [ ] **FE-504** Full Playwright flow: register, draw farm, upload, scenario, compare.
- [ ] **FE-505** Demo mode with cached data so the presentation works without internet.

## F6. Spanish port (final phase only)

- [ ] **FE-601** Complete the Spanish catalog, language switcher, persisted choice, `Accept-Language`. *AC: test that all English keys exist in Spanish. Pseudo-locale test for layout.*
- [ ] **FE-602** Native speaker review, including agronomy terms.

Cut line if time is short: F0 to F4 are the minimum. F5 and F6 are optional in that order.

---

# PART E: Task instruction template (send this to an agent)

```
Task: <ID and title, e.g. FE-304 Scenario panel>
Repo: agrofarm-frontend
Context: <why this matters, link to the section of AGENTS.md>
Scope: <directories and files allowed to change>
Out of scope: <what must not be touched>
Acceptance criteria (write these as tests first):
  - ...
Constraints: English only. TDD. No new dependency without justification.
Deliver: branch cut from `develop`, pull request into `develop` with description, summary of `make check`,
         list of anything not verified.
```

# PART F: Definition of done

- [ ] Tests were written first and are in the commit history.
- [ ] `make check` passes locally and CI is green.
- [ ] Coverage on changed code is at least 80%.
- [ ] No hardcoded UI strings. Everything is English.
- [ ] axe finds no new accessibility issues.
- [ ] Docs, OpenAPI types and `.env.example` are updated if needed.
- [ ] The PR targets `develop` and closes its issue.
- [ ] The PR description explains what changed and what is not verified.

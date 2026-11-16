# Frontend Polish Progress (`@MarceloDetlefsen`, Person 6)

Date: 2026-11-15  
Base `develop` commit at start: `291eb1b`

## Open Pull Requests (Recommended Merge Order)

1. **PR #66** — `feat/fe-polish-scenarios` (`feat(scenarios): add one-click presets, plain-language summary, and provenance bar`)
   - **What it changes:** Adds 4 one-click scenario presets above the sliders (`El Nino: drier year`, `La Nina: wetter year`, `Heatwave`, `Normal year (reset)`), active `aria-pressed` state that clears on manual slider changes, a data-driven plain-language summary sentence (handling positive, negative, zero-crossing, and neutral ranges), a discrete provenance bar showing model name/version + stub notice + API disclaimer, and component-scoped styles in `src/features/simulation/simulation.css`.
   - **How to test:** `npx vitest run src/domain/__tests__/scenario.test.ts src/features/simulation/__tests__/ScenarioPanel.test.tsx`

2. **PR #67** — `feat/fe-polish-uploads` (`feat(uploads): add sample files, accessible dropzones, and error report CSV`)
   - **What it changes:** Adds 3 verified DEC-005 synthetic sample files under `public/samples/` (`farm-valid.csv`, `farm-valid.geojson`, `farm-invalid.csv`), one-click "Try with a sample file" buttons in `UploadWizard`, a reusable accessible `FileDropzone` (`src/components/FileDropzone.tsx`) for both farm uploads and maize leaf photos, and a "Download error report" CSV button in `UploadSummary` with DEC-005 formula-injection escaping.
   - **How to test:** `npx vitest run src/features/uploads/__tests__/UploadWizard.test.tsx src/features/leaves/__tests__/LeafAssessmentPanel.test.tsx`

3. **PR #68** — `feat/fe-polish-recommendations` (`feat(recommendations): add priority presets, jump links, and collapsible detail blocks`)
   - **What it changes:** Adds 4 one-click priority presets (`Save water`, `More income`, `Build soil`, `Balanced (reset)`) that set all 7 sliders and immediately save to refresh recommendations, adds "Jump to comparison" and "Back to priorities" focus-moving buttons, wraps the 5 strategy blocks in native `<details open>` collapsible sections, and adds `src/features/rotations/rotations.css`.
   - **How to test:** `npx vitest run src/features/rotations/__tests__/PrioritiesForm.test.tsx src/features/rotations/__tests__/RotationComparison.test.tsx src/features/rotations/__tests__/StrategyDrawer.test.tsx`

4. **PR #69** — `feat/fe-polish-climate` (`feat(climate): overlay ENSO phase bands, toggle, and period summary card`)
   - **What it changes:** Overlays shaded ENSO phase bands (`el_nino`, `la_nina`, `neutral`) with `EN`/`LN`/`NE` text labels on `ClimateChart`, adds a "Show ENSO phases" toggle and matching legend items, adds `summarizeClimatePeriod` in `src/domain/chart.ts` with a client-calculated "Period summary" card (wettest month, driest month, total rainfall, mean temperature, and non-causal ENSO month coincidence counts), and adds `src/features/climate/climate.css`.
   - **How to test:** `npx vitest run src/domain/__tests__/summary.test.ts src/features/climate/__tests__/ClimatePanel.test.tsx`

5. **PR #70** — `feat/fe-polish-resilience` (`feat(resilience): add cold-start loading, 401 demo restart, and glossary tooltips`)
   - **What it changes:** Adds reusable `PanelLoadingState` (surfaces "Waking up the server…" after 3 s), `PanelErrorState` (offers one-click "Start a new demo" on `401`, plus friendly messages for `422`, `429`, `503`, and network/timeout), and `PanelEmptyState` (`src/components/PanelState.tsx`), plus `GlossaryTerm` tooltips for `percentile`, `ENSO`, and `reanalysis`.
   - **Merge note:** When merging PR #70 after PR #69, `src/features/climate/components/ClimatePanel.tsx` has a minor 1-block import conflict between `summarizeClimatePeriod` (PR #69) and `PanelState` (PR #70) that resolves by keeping both imports.
   - **How to test:** `npm test`

6. **PR #71 (this branch)** — `docs/fe-polish-summary` (`docs: record frontend polish progress, assumptions, screenshots, and AI usage`)
   - **What it changes:** Adds `docs/frontend-polish/PROGRESS.md`, `docs/frontend-polish/ASSUMPTIONS.md`, 5 verification screenshots under `docs/frontend-polish/screenshots/`, and adds `@MarceloDetlefsen` to `AI_USAGE.md`.

## T6 Integration & E2E Verification (Local Frontend vs `core-api-staging`)

All 5 feature branches were merged locally into a temporary integration branch (`temp/fe-polish-integration`, not pushed):

- **`npm run typecheck`:** passed (0 errors).
- **`npx vitest run --coverage`:** 42 test files passed, 392 tests passed, line coverage > 80% gate.
- **`npm run build`:** passed in 370 ms. Main JS chunk `dist/assets/index-DVggmCY2.js` = `127.92 kB` gzipped (within 250 kB budget). MSW (`browser-*.js`) is lazy-loaded only when `useMocks: true`.
- **Live E2E Walkthrough (`apiBaseUrl = https://core-api-staging-7l2bzjrqpq-uc.a.run.app`, `useMocks: false`):**
  1. Landing -> "Try the demo" -> My farm (`Guatemala Pilot Farm (Provisional)`): OK.
  2. Farm data: uploaded `farm-valid.csv` (`File accepted`, 3/3 rows) and `farm-invalid.csv` (`File accepted with row errors`, "Download error report" visible): OK.
  3. Explore scenarios: clicked `El Nino: drier year` -> summary rendered from API (`Under this scenario, the middle estimate for maize yield is -16.75 % compared with a normal year, within a likely range of -28.75 % to -5.75 %.`): OK.
  4. Recommendations: clicked `Save water` preset -> saved & refreshed -> clicked `Jump to comparison` -> 4 strategies compared: OK.
  5. Climate: `Show ENSO phases` overlay (`EN`, `NE`, `LN`) + `Period summary` card rendered: OK.
  6. Mobile (`375x812`): `0 px` horizontal overflow on Scenarios: OK.
  7. "Leave the demo" returned cleanly to Landing: OK.
  8. Console errors: `0`, Page errors: `0`.

## Scope & Deferred Items

- Did not touch `FarmDashboard`, `AppShell`, `Navigation`, `LandingPage`, router, or `src/styles.css` to avoid conflicts with `@angcoder-c` and `@eldmark` (PR #65).
- No sample maize leaf photo was bundled to avoid image rights/metadata risks (users can drop or browse any local JPEG/PNG).

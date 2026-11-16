# Frontend Polish Assumptions & Observations

Date: 2026-11-15  
Author: `@MarceloDetlefsen` (Person 6)

## 1. Initial Walkthrough Findings (Before Edits, Against `core-api-staging`)

Walked through all routes via Chromium (`1440x900` and `375x812`) against `https://core-api-staging-7l2bzjrqpq-uc.a.run.app` with `useMocks: false`:

- **Scenarios (`/scenarios`):** With default inputs (`0 %` rain, `0 °C`, `Neutral`), Baseline and Scenario bars are identical and sit below the fold, so a judge who does not move sliders sees no difference. No one-click presets or summary sentence existed above the chart.
- **Farm data (`/data`):** Upload step 2 used a native `<input type="file">` with no sample files for judges who lack DEC-005 CSV/GeoJSON files. Leaf assessment also used a native `<input type="file">`.
- **Recommendations (`/recommendations`):** The 7 priority sliders plus constraints filled the initial viewport, pushing the rotation comparison entirely below the fold with no quick priority presets or jump link.
- **Climate (`/climate`):** The ENSO strip rendered below the chart and source card, not overlaid on the rainfall/temperature chart itself, and there was no period summary card.

## 2. Preset Values & Rationale

### Scenario Presets (`src/domain/scenario.ts`)

All values are illustrative seasonal anomalies within contract limits (`rainfall_change_pct` in `[-80, 100]`, `temperature_change_c` in `[-5, 8]`) and never represent forecasts:

- **El Nino: drier year:** `-20 %` rainfall, `+1.5 °C` temperature, `enso_phase: 'el_nino'` (illustrates typical drier/warmer Pacific-side Central America El Nino conditions).
- **La Nina: wetter year:** `+25 %` rainfall, `-0.5 °C` temperature, `enso_phase: 'la_nina'` (illustrates wetter/slightly cooler La Nina conditions).
- **Heatwave:** `-10 %` rainfall, `+3.5 °C` temperature, `enso_phase: 'neutral'` (illustrates acute heat stress).
- **Normal year (reset):** `0 %` rainfall, `0 °C` temperature, `enso_phase: 'neutral'` (matches `DEFAULT_SCENARIO`).

### Priority Presets (`src/domain/priorities.ts`)

All weights are in `[0, 1]` matching `core-api` (`0..100` in UI sliders):

- **Save water:** `water_use: 0.95`, `erosion_reduction: 0.85`, `soil_structure: 0.7`, `income: 0.5`, `nitrogen_fixing: 0.5`, `market_suitability: 0.4`, `forage_value: 0.3`.
- **More income:** `income: 0.95`, `market_suitability: 0.9`, `soil_structure: 0.45`, `water_use: 0.4`, `forage_value: 0.4`, `nitrogen_fixing: 0.4`, `erosion_reduction: 0.4`.
- **Build soil:** `soil_structure: 0.95`, `nitrogen_fixing: 0.95`, `erosion_reduction: 0.9`, `water_use: 0.65`, `income: 0.45`, `forage_value: 0.4`, `market_suitability: 0.4`.
- **Balanced (reset):** `0.5` for all 7 weights (matches `DEFAULT_PRIORITIES.weights`).

## 3. DEC-005 Sample Files Verified Against `core-api-staging`

Tested with a demo guest against `https://core-api-staging-7l2bzjrqpq-uc.a.run.app/v1/farms/{farm_id}/uploads`:

- `public/samples/farm-valid.csv`: HTTP `201`, `status: "accepted"`, `rows_total: 3`, `rows_accepted: 3`, `errors: []`.
- `public/samples/farm-valid.geojson`: HTTP `201`, `status: "accepted"`, `rows_total: 1`, `rows_accepted: 1`, `errors: []` (provisional Guatemala City polygon in `EPSG:4326`).
- `public/samples/farm-invalid.csv`: HTTP `201`, `status: "accepted_with_errors"`, `rows_total: 2`, `rows_accepted: 1`, `errors: 7` (row 2 triggers `parcel_id`, `sowing_date`, `area_ha`, `latitude`, `yield_kg_ha`, `soil_ph`, `irrigation` errors). Included 1 valid row so users can proceed past the client-side check and observe server-side row validation + error CSV download.

## 4. Maize Leaf Photo Sample Omission

No sample leaf image was bundled in `public/samples/` to avoid image licensing, EXIF/metadata, or synthetic-image ambiguity; the accessible dropzone accepts any local JPEG or PNG up to 5 MiB.

## 5. Observations for Teammates (Out of Scope for Person 6)

- **Mobile header/nav (`@angcoder-c` / `@eldmark`):** At `375 px` viewport width, the "Leave the demo" button in the top bar wraps onto 3 lines right next to the theme toggle button, and there is no mobile navigation drawer button visible in the top bar to switch between routes. Left untouched per coordination rules.
- **Pre-existing Prettier warning on `AI_USAGE.md`:** `develop` at `291eb1b` had an unformatted table in `AI_USAGE.md`; formatted in PR #71 (`docs/fe-polish-summary`).

## 6. Climate Reality Check & Crop Stress Test Decisions (PR #72 & PR #73)

- **Wet-season definition (May–October):** Verified against the full 1995–2025 NASA POWER monthly series (`372` months) on `core-api-staging`: monthly means for Nov–Apr are `6.8–55.0 mm/month`, whereas May–Oct are `149.8–240.1 mm/month` (`05: 149.8`, `06: 235.2`, `07: 179.2`, `08: 219.2`, `09: 240.1`, `10: 181.0 mm`). Using May–Oct matches the observed bimodal rainy season cleanly.
- **Crop list for Stress Test (`STRESS_TEST_CROPS`):** `['maize', 'black_beans', 'cover_crop']` (the three planted pilot crops in the rotation engine, excluding `fallow`). Verified against `core-api-staging` `POST /v1/scenarios/simulate`: all three return HTTP `200`, and under `agrofarm-stub` (`stub-0.1.0`) currently return identical quantiles (`-16.75 %` median under El Nino preset), so `analyzeStressMatrix` explicitly flags ties (`allCropsEqual`) instead of claiming false crop differentiation.
- **Standalone branch compatibility:** Because PRs #66–#71 were still open when cutting `feat/fe-reality-check` and `feat/fe-stress-test` from `develop` (`1a53935`), `SCENARIO_PRESETS` lives in a dedicated `src/domain/scenarioPresets.ts` module and both panels use `AsyncState` + `errorKey` from `develop` so both PRs pass CI independently. When merging #66, #72, and #73 in sequence, `ScenarioPanel.tsx` and `common.json` may need a quick rebase to keep all sections in order.

# Landing page and inner pages: what was built and why

Status: 2026-11-15. This describes `agrofarm-frontend` after pull requests #65 and #74 to #78.

## Landing page (`src/pages/LandingPage.tsx`, `src/pages/landing/`)

Blocks, from top to bottom, each a full-width band (night green, paper or sage) so the page is easy to scan:

| Block                      | What it does                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                       | Short headline, one yellow action ("Try the demo"), a maize ear image and an index of the blocks. Log in and Create an account live in the top bar.                                   |
| The project                | What AgroFarm is, in two short paragraphs.                                                                                                                                            |
| From the field to decision | A pinned scroll story. Scrolling plays a 48-frame image sequence (`public/landing/seq/f000.webp` to `f047.webp`): the camera moves closer to a maize ear, turns, and kernels pop out. |
| How it works               | Four cards that flip (button, hover and keyboard).                                                                                                                                    |
| Decisions                  | A table: the question, what the tool shows, what it cannot decide. It contains no invented numbers.                                                                                   |
| Crops                      | A photo for each pilot crop and a comparison grid (see "Crop data").                                                                                                                  |
| Limits and call to action  | What the tool promises and does not, then a second button to the demo.                                                                                                                |
| Team                       | The team, links to the four repositories, the copyright line and the NASA non-endorsement note (`LandingFooter.tsx`, `team.ts`).                                                      |

Motion rules: the scroll story and the reveal-on-scroll items are switched off or shown in their final state when the visitor prefers reduced motion. A thin progress bar runs along the bottom of the screen.

### Assets

- **Maize ear images and the sequence** were made in Blender 5.2: kernels, husk and silk are built procedurally with Python and rendered with EEVEE on a transparent background. The scripts were run interactively and are **not stored in this repository**; keeping them is a follow-up.
- **Photographs** come from Wikimedia Commons. Authors, licences and source pages: `public/landing/CREDITS.md`. The photos of black beans, cover crop and fallow are not from Guatemala.
- **Fonts** are self-hosted with `@fontsource-variable/fraunces` (titles) and `@fontsource-variable/inter` (text).

### Crop data (`src/domain/crops.ts`)

The comparison grid and the strategy screens use the values of the team's crop traits table, `agrofarm-analytic/services/ml/src/agrofarm_ml/rotations/data/crop_traits.json`, version 0.1.0. The table is **provisional** and its values are not verified against sources. The values are **copied by hand** into `crops.ts`; if the table changes, update both. The page says so in plain words.

## Inner pages

- Every page has a plain explanation, three things to do, "Step N of 5" and a link to the next step. The side menu numbers the steps; on small screens it becomes a bar under the header.
- **Best crops:** the strategy cards are short (photos of the crops, score, range). "View details" opens a screen of its own instead of a side panel: banner with the photos, what happens in each season, the farm map once per season with a pattern for the crop (`FarmCropMap`), then all evidence, gaps, risks and the glossary.
- **Try a season:** the main result is a dark card with a plain headline, three big figures and a range bar. Colours are always paired with the sign and with words.
- **Weather:** a plain summary first (rainiest and driest month, total rain, average temperature, usual rainy months). The chart shows rain and average temperature; the coolest and warmest lines are optional. The data source is in a drawer under the chart.
- **Accessibility:** 44 px targets, a visible focus ring, labelled maps and controls, reduced-motion paths, and automated axe checks in the tests.

## Maps

- `FarmZoneMap` (farm page): drawn from OpenStreetMap image tiles with the farm outline on top, with editing of the outline and location. The production CSP allows `img-src https:` for the tiles and `frame-src` for the OpenStreetMap embed tab. Its initial zoom fits the whole farm in the frame.
- `FarmCropMap` (strategy screen): the same idea, compact, with a pattern for the crop inside the outline.

## Known limits and follow-ups

- The Blender scripts are not in the repository.
- The values in `src/domain/crops.ts` must be kept in sync with the analytic traits table by hand.
- The Dependabot alert (1 moderate) that GitHub reported when pushing to this repository has not been triaged.
- The edit tools of `FarmZoneMap` are developer-style (presets and raw coordinates); a farmer-friendly editor is not built.
- No `LICENSE` file exists; the landing page says "All rights reserved". The team may choose an open licence.

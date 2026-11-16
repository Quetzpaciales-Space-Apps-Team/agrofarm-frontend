# AI usage in `agrofarm-frontend`

This file is the public statement required by the NASA Space Apps Challenge 2026 submission rules: where and how AI tools were used. The rule that keeps it true is G11 in [`AGENTS.md`](AGENTS.md).

## Summary

AI coding assistants were used as tools to write and review code, tests, CI workflows, contracts and documentation. They did not choose the idea of the solution. A team member reviews every pull request before it is merged.

## Tools

| Tool          | Model               | Used by                     | Used for                                                                                                                                                                                                                                |
| ------------- | ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code   | `claude-fable-5-2`  | `eldmark`                   | Repository rules, CI, scaffolds, connectors, tests, documentation, data analysis                                                                                                                                                        |
| Claude Code   | `claude-sonnet-5-5` | `eldmark`                   | Auth screens, session restore, API client middlewares and their tests (FE-101, FE-103, FE-104, FE-105)                                                                                                                                  |
| Claude Code   | `claude-sonnet-5-5` | `eldmark`                   | Upload wizard (FE-401): code and tests                                                                                                                                                                                                  |
| Claude Code   | `claude-sonnet-5-5` | `eldmark`                   | Landing page redesign and its animation, procedural Blender models and renders of the maize ear, plain-language inner pages, strategy detail screen, weather and scenario pages, map layout fixes, tests and documentation (2026-11-15) |
| Google Gemini | `Gemini`            | `MagicBag-tab`              | Visual UI/UX edits, dashboard shell styling and responsive layout refinements                                                                                                                                                           |
| OpenAI Codex  | `GPT-5.6-luna`      | `MagicBag-tab`              | Issue tracking, architecture review, merge-conflict resolution, test updates, lint/typecheck verification and UI review                                                                                                                 |
| Antigravity   | `Gemini 3.8`        | `Angel Chavez (angcoder-c)` | Farm creation flow, interactive demo tutorial (Driver.js), farm zone map, dark mode implementation, and layout/sidebar UI fixes                                                                                                         |
| Antigravity   | `Gemini 4 Hydrogen` | `MarceloDetlefsen`          | UI polish, unit/component tests, sample fixtures, and documentation (reviewed by human)                                                                                                                                                 |

Team members who used another tool add a row here in their next pull request (rule G11.3).

OpenAI Codex (`GPT-6`), used by `eldmark`, assisted with the maize-leaf photo screen, binary API transport, tests, contract synchronization and deployment verification. It did not choose the feature idea, generate the source photos or perform the agronomy review.

For the visual redesign work, Google Gemini edited the frontend implementation under team direction. OpenAI Codex reviewed the changes, tracked issue scope, resolved integration conflicts, updated tests and verified the resulting checks. The team member reviewed the final output before merge.

## How to trace each use

- **Commits.** From 2026-11-14, every AI-assisted commit ends with an `Assisted-by: <tool> (<model>)` trailer:
  `git log --grep="^Assisted-by:" --format="%h %an %s"`
- **Pull requests.** Every pull request has an "AI use" section that says what the tool did and who reviewed it.
- **Before the rule.** Commits authored by `eldmark` (Marco Diaz) on 2026-11-14 before this file existed were written with Claude Code and reviewed by the author. They do not carry the trailer because history is never rewritten (rule G8). Other authors: not recorded, each author states it here.

## Not generated with AI

- The project idea and the choice of challenge.
- Source datasets (INSIVUMEH, NOAA, NASA, CHIRPS, SoilGrids and the others in the dataset catalog).
- The photographs on the landing page (maize, black beans, cover crop, fallow, cacao). They are real photos from Wikimedia Commons (CC0, public domain or CC BY-SA); authors and licences are in `public/landing/CREDITS.md`. The maize ear images on the landing page are renders from a 3D model that Claude Code built with code in Blender; they are not photographs.

OpenAI Codex (GPT-6), 2026-11-15: added the regional NDVI scenario panel with uncertainty, original failed-goal metrics, SHAP differences and reference-cell caveats, and contained the simulation chart on mobile. Photo and NDVI integration was explicitly authorized by the owner.

# AI usage in `agrofarm-frontend`

This file is the public statement required by the NASA Space Apps Challenge 2026 submission rules: where and how AI tools were used. The rule that keeps it true is G11 in [`AGENTS.md`](AGENTS.md).

## Summary

AI coding assistants were used as tools to write and review code, tests, CI workflows, contracts and documentation. They did not choose the idea of the solution. A team member reviews every pull request before it is merged.

## Tools

| Tool        | Model              | Used by   | Used for                                                                         |
| ----------- | ------------------ | --------- | -------------------------------------------------------------------------------- |
| Claude Code | `claude-fable-5-2` | `eldmark` | Repository rules, CI, scaffolds, connectors, tests, documentation, data analysis |

Team members who used another tool add a row here in their next pull request (rule G11.3).

OpenAI Codex (`GPT-6`), used by `eldmark`, assisted with the maize-leaf photo screen, binary API transport, tests, contract synchronization and deployment verification. It did not choose the feature idea, generate the source photos or perform the agronomy review.

## How to trace each use

- **Commits.** From 2026-11-14, every AI-assisted commit ends with an `Assisted-by: <tool> (<model>)` trailer:
  `git log --grep="^Assisted-by:" --format="%h %an %s"`
- **Pull requests.** Every pull request has an "AI use" section that says what the tool did and who reviewed it.
- **Before the rule.** Commits authored by `eldmark` (Marco Diaz) on 2026-11-14 before this file existed were written with Claude Code and reviewed by the author. They do not carry the trailer because history is never rewritten (rule G8). Other authors: not recorded, each author states it here.

## Not generated with AI

- The project idea and the choice of challenge.
- Source datasets (INSIVUMEH, NOAA, NASA, CHIRPS, SoilGrids and the others in the dataset catalog).

OpenAI Codex (GPT-6), 2026-11-15: added the regional NDVI scenario panel with uncertainty, original failed-goal metrics, SHAP differences and reference-cell caveats, and contained the simulation chart on mobile. Photo and NDVI integration was explicitly authorized by the owner.

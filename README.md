# agrofarm-frontend

React + Vite single page app: interactive maps, scenario simulation and rotation comparison (service `frontend`).

Part of AgroFarm, a crop growth and rotation simulator for farmers. The tool supports decisions. It never replaces farmers or local agronomists.

## Start here

- **Rules for people and agents:** [`AGENTS.md`](AGENTS.md). Read it before changing anything.
- **Tasks:** the GitHub issues of this repository. Issues labeled `agent-ready` can be given to an agent. Issues labeled `needs-human` need a person.
- **Shared plan and dataset catalog:** the `agrofarm-docs` repository.

## Development Setup

- **Node.js:** `>=20`
- **Package manager:** `npm` (committed lockfile: `package-lock.json`)

```bash
npm ci
cp .env.example .env
make dev        # Start local Vite dev server
make check      # Run lint, typecheck and tests
make build      # Build production bundle
```

## The short version of the rules

1. Everything is written in English.
2. Tests first (TDD). CI must be green.
3. Branch from `develop`, open a pull request into `develop`. Nobody pushes to `develop` or `main` directly.
4. `develop` deploys to staging. `main` deploys to production after manual approval.
5. One task, one branch, one pull request.

## Repositories

| Repo                | Service(s)                   |
| ------------------- | ---------------------------- |
| `agrofarm-frontend` | `frontend`                   |
| `agrofarm-api`      | `core-api`                   |
| `agrofarm-analytic` | `ml-service`, `data-service` |
| `agrofarm-docs`     | documentation only           |

## AI assistance

Parts of this repository were written with AI coding assistants and reviewed by the team. See [`AI_USAGE.md`](AI_USAGE.md) for the tools, what they were used for and how to trace each use.

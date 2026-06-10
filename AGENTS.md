# Project Overview

_Kontor_ is a Progressive Web App (mobile and desktop) that consolidates personal finance data — transactions, portfolios, market data — and uses a GenAI layer to surface personalized, actionable insights. Stock and ETF data is sourced via Yahoo Finance; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI |
| Backend | Java 25, Spring Boot 4, Gradle (microservices) |
| AI Service | Python 3.14, FastAPI, uv |
| Linting/Formatting | Biome (frontend), Spotless (Palantir Java Format) + Checkstyle + Error Prone (backend), Ruff (AI) |

## Commands

### Client (`client/`)

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Lint (autofix) | `npm run lint:fix` |
| Format (autofix) | `npm run format` |
| Regenerate API client | `npm run generate:api` |

### Server

Each microservice lives in its own directory with a Gradle wrapper.

#### Core (`core/`)

| Task | Command |
|------|---------|
| Build | `./gradlew build` |
| Test | `./gradlew test` |
| Compile check | `./gradlew compileJava` |
| Format check | `./gradlew spotlessCheck` |
| Format fix | `./gradlew spotlessApply` |
| Lint | `./gradlew checkstyleMain checkstyleTest` |
| Regenerate OpenAPI spec | `./gradlew generateOpenApiDocs` |

### AI Service (`ai/`)

| Task | Command |
|------|---------|
| Install dependencies | `uv sync` |
| Dev server | `uv run uvicorn advisor.main:app --reload` |
| Test | `uv run pytest` |
| Type check | `uv run ty check` |
| Format check | `uv run ruff format --check .` |
| Format fix | `uv run ruff format .` |
| Lint | `uv run ruff check .` |
| Lint (autofix) | `uv run ruff check --fix .` |

## OpenAPI

The TypeScript client (`client/src/network/generated/`) is generated from the
server's OpenAPI spec (`core/docs/openapi.yml`), which is itself generated from
the annotated controllers. After changing any controller or its request/response
DTOs, regenerate both — `./gradlew generateOpenApiDocs` (core) then
`npm run generate:api` (client) — and commit the result. CI's `openapi-sync`
workflow fails if the committed files are out of sync.

## Deployment

Helm chart at `deploy/helm/kontor/` (client, core, Postgres, Keycloak), deployed
by CI: push to `main` → prod in namespace `team-3m`; PR + `deploy:preview` label →
ephemeral preview in `team-3m-pr-<N>`. See `deploy/helm/kontor/README.md` and
`deploy/rbac/README.md`.

Manually triggering the `CI/CD` workflow (`workflow_dispatch`) always deploys
prod, even when semantic-release produces no new version — in that case it
redeploys the latest existing version tag. This is the supported way to
re-run a prod deploy (e.g. after a failed rollout) without a code change.

### Keycloak login theme

Keycloak runs as a custom image (`kontor-keycloak`) with the Kontor login theme
baked in. The theme is a minimal vendored [Keycloakify](https://keycloakify.dev/)
project at `infra/keycloak/theme/`; its multi-stage Dockerfile builds the theme
jar (Node + Maven) and copies it into `/opt/keycloak/providers/`. Compose builds
it locally; CI builds and pushes it (`keycloak-docker` job in `pr.yml` /
`ci-cd.yml`). The realm selects it via `loginTheme: kontor`. To change the theme,
edit the vendored source — see `infra/keycloak/theme/README.md`.

## Rules

- Do not manually fix formatting or linting errors — run the formatter/linter instead

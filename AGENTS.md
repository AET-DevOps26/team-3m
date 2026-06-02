# Project Overview

_Kontor_ is a Progressive Web App (mobile and desktop) that consolidates personal finance data — transactions, portfolios, market data — and uses a GenAI layer to surface personalized, actionable insights. Stock and ETF data is sourced via Yahoo Finance; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI |
| Backend | Java 25, Spring Boot 4, Gradle (microservices) |
| Linting/Formatting | Biome (frontend), Spotless (Palantir Java Format) + Checkstyle + Error Prone (backend) |

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

## Rules

- Do not manually fix formatting or linting errors — run the formatter/linter instead

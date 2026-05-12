# Project Overview

_Kontor_ is a Progressive Web App (mobile and desktop) that consolidates personal finance data — transactions, portfolios, market data — and uses a GenAI layer to surface personalized, actionable insights. Stock and ETF data is sourced via Yahoo Finance; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI |
| Backend | Java 25, Spring Boot 4, Gradle (microservices) |
| Linting/Formatting | Biome (frontend), google-java-format + checkstyle (backend) |

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

### Server

Each microservice lives in its own directory with a Gradle wrapper.

#### Core (`core/`)

| Task | Command |
|------|---------|
| Build | `./gradlew build` |
| Test | `./gradlew test` |
| Compile check | `./gradlew compileJava` |

## Rules

- Do not manually fix formatting or linting errors — run the formatter/linter instead

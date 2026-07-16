# Project Overview

_Kontor_ consolidates personal finance data — transactions, portfolios, market data — and uses a GenAI layer to surface personalized, actionable insights. Stock and ETF data is sourced from Twelve Data; the AI component uses Retrieval-Augmented Generation (RAG) over the user's own financial data and curated financial news.

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
| Unit tests | `npm test` |
| Unit tests (watch) | `npm run test:watch` |
| Unit tests (coverage) | `npm run test:coverage` |
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

#### News (`news/`)

Market-news aggregator: crawls RSS feeds and publishes new articles to the
RabbitMQ queue `news.articles` (contract: `news/docs/asyncapi.yml`) for the
AI service; stores only crawl/push metadata in its own `news`
Postgres instance. Same Gradle toolchain and commands as core:

| Task | Command |
|------|---------|
| Build | `./gradlew build` |
| Test | `./gradlew test` |
| Compile check | `./gradlew compileJava` |
| Format check | `./gradlew spotlessCheck` |
| Format fix | `./gradlew spotlessApply` |
| Lint | `./gradlew checkstyleMain checkstyleTest` |

See `news/README.md` for the aggregation design and producer/consumer contract
(no embeddings/chunking in the news service by design).

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
| Regenerate OpenAPI spec | `uv run export-openapi` |

## OpenAPI

The TypeScript client is generated from each backend's OpenAPI spec:

- **Core** (`client/src/network/generated/`) ← `core/docs/openapi.yml`, generated
  from the annotated Spring controllers via `./gradlew generateOpenApiDocs` (core).
- **AI** (`client/src/network/generated-ai/`) ← `ai/docs/openapi.json`, generated
  from the FastAPI app via `uv run export-openapi` (ai).

After changing any controller/route or its request/response DTOs, regenerate the
relevant spec, then run `npm run generate:api` (client) — which regenerates both
client outputs — and commit the result. CI's `openapi-sync` workflow fails if the
committed files are out of sync.

## Deployment

Helm chart at `deploy/helm/kontor/` (client, core, news, ai, Postgres, Keycloak), deployed
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
jar (Node + Maven) and copies it into `/opt/keycloak/providers/`. Local compose
builds it locally; CI builds and pushes it (`keycloak-docker` job in `pr.yml` /
`ci-cd.yml`), and both the Helm chart (k8s) and the Azure compose
(`docker-compose.azure.yml`, tag via `KONTOR_KEYCLOAK_IMAGE_TAG`) pull that
prebuilt image. The realm selects it via `loginTheme: kontor`. To change the
theme, edit the vendored source — see `infra/keycloak/theme/README.md`.

## Observability

A single shared LGTM stack (Loki, Grafana, Tempo, Prometheus) with SeaweedFS object
storage and a Grafana Alloy OTLP gateway serves **all** environments. It lives in
its own chart (`deploy/helm/observability/`), namespace (`team-3m-monitoring`), and
workflow (`.github/workflows/observability.yml`, `workflow_dispatch` — deploy and
redeploy on demand, no versioning). PR deploy/teardown never touches it.

- **Instrumentation**: OTel Java agent (core, baked into the image),
  `opentelemetry-distro`/`-instrument` (ai), **Grafana Faro** (`@grafana/faro-react`)
  for browser RUM on the client, and Keycloak's built-in tracing/metrics.
- **Signals**: core/news/ai/client/keycloak send **traces** (the client ships them via
  Faro → the Alloy `faro.receiver` → Tempo); service **logs** are collected from pod
  stdout by the Alloy log collector via the Kubernetes API, and Faro also ships
  browser logs/Web-Vitals to Loki; **metrics** come from core, news, ai, and Keycloak.
- **Filtering**: every signal is tagged `deployment_environment` (`prod`, `pr-<N>`,
  `local`) + `service`, so one Grafana variable switches across environments.
- **Retention** (auto, strict for PRs): Loki per-stream prod 30d / pr 48h / default
  14d; Tempo 7d; Prometheus 15d.
- Config under `deploy/helm/observability/files/` is the single source shared with
  the local stack (`docker-compose.observability.yml`):
  `docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d`
  → Grafana on http://localhost:3001. Enable in the app chart with
  `observability.enabled=true` (on by default in the prod and PR overlays).

See `deploy/helm/observability/README.md`.

## AI agents

### Recommendation agent

`POST /ai/advisor/recommendation` grounds its advice in relevant financial news
retrieved from a pgvector store, matched to the caller's holdings at generation
time. It retrieves the nearest news by cosine similarity to a query built from the
holdings (rejecting matches beyond a distance threshold so unrelated news is not
grounded as evidence), and also supports optional symbol metadata, though the
bundled aggregator currently publishes article text without ticker tags. Retrieved
articles are serialized as delimiter-safe JSON and injected into the prompt as
untrusted data; the response carries a `news_summary` and server-built
`news_references` (grounded citations).

### News ingest consumer

A background consumer (started in the FastAPI `lifespan` when a RabbitMQ URL or host
is configured) subscribes to a RabbitMQ queue, embeds each article, and upserts it
into the `news_article` table (pgvector). Each row stores the embedding model +
dimension, so switching embedding provider never mixes vector dimensions at query
time. A background sweeper deletes articles older than `NEWS_RETENTION_DAYS`
(default 7) every `NEWS_RETENTION_SWEEP_INTERVAL_SECONDS` (default 3600),
independently of ingest, so append-only RSS ingest can't exhaust the shared database
and take recommendation persistence down with it.

Embeddings mirror the LLM provider resolution: the hosted OpenAI-compatible provider
uses `AI_API_KEY`, `AI_BASE_URL`, and `AI_EMBEDDING_MODEL`; otherwise the service
uses Ollama (`LOCAL_EMBEDDING_MODEL`, default `nomic-embed-text`).

#### Queue contract

The bundled news service owns the RabbitMQ exchanges and queues and publishes the
contract in `news/docs/asyncapi.yml`. This consumer subscribes passively to
`NEWS_QUEUE` (default `news.articles`) and republishes terminal failures to the
producer-owned dead-letter exchange before acknowledging the original. Configure
either `RABBITMQ_URL` for an external TLS/vhost broker or the discrete
`RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, and `RABBITMQ_PASSWORD`
settings used by Compose and Helm.

Message bodies use the producer-owned camelCase schema. Unknown additive fields are
ignored, while the required contract is validated before any embedding call.

| Field         | Type          | Notes                                             |
| ------------- | ------------- | ------------------------------------------------- |
| `id`          | string        | Required 64-char URL hash and idempotency key.    |
| `source`      | string        | Required configured feed name.                   |
| `feedUrl`     | string        | Required source feed URL.                         |
| `url`         | string        | Required article URL.                             |
| `title`       | string        | Required article title.                           |
| `summary`     | string/null   | Feed summary; content fallback when full text is absent. |
| `contentText` | string/null   | Best-effort extracted article text.               |
| `publishedAt` | datetime/null | Feed publication time.                            |
| `fetchedAt`   | datetime      | Aggregator fetch time.                            |

Delivery is at-least-once; ingest deduplicates on both `id` and the sanitized content
hash. Invalid messages are rejected immediately. Processing failures are retried once,
then rejected into the bounded `news.articles.dead` queue for inspection instead of
cycling indefinitely. The consumer runs in the API process and remains isolated from
recommendation serving.

## Rules

- Do not manually fix formatting or linting errors — run the formatter/linter instead

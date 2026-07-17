# Kontor AI

FastAPI service powering Kontor's GenAI layer: it turns the user's portfolio
into a personalized recommendation via an LLM and stores the latest result per
user. Python 3.14, managed with [uv](https://docs.astral.sh/uv/).

## Getting Started

```sh
uv sync                                       # install dependencies
uv run uvicorn advisor.main:app --reload      # dev server on http://localhost:8000
```

Running against a real database also needs the migrations applied (see
[Database](#database)); under compose this happens automatically via the
`ai-migrate` service.

## Tasks

| Task             | Command                        |
| ---------------- | ------------------------------ |
| Install deps     | `uv sync`                      |
| Dev server       | `uv run uvicorn advisor.main:app --reload` |
| Test             | `uv run pytest`                |
| Type check       | `uv run ty check`              |
| Format check     | `uv run ruff format --check .` |
| Format fix       | `uv run ruff format .`         |
| Lint             | `uv run ruff check .`          |
| Lint (autofix)   | `uv run ruff check --fix .`    |
| DB migrations    | `uv run alembic upgrade head`  |

## API

All routes are mounted under the `/ai` prefix. The health probes are public;
everything else requires a Keycloak bearer token (validated against the JWK
set, audience `kontor-api`):

| Route | Purpose |
|-------|---------|
| `POST /ai/advisor/recommendation` | Generate a recommendation from the submitted portfolio |
| `GET /ai/advisor/recommendation` | Latest stored recommendation for the user (`404` if none) |
| `GET /ai/health/liveness`, `GET /ai/health/readiness` | Health probes (no auth) |

## LLM backends

Requests go to the hosted OpenAI-compatible provider (`AI_BASE_URL`) when
`AI_API_KEY` is set; otherwise the service falls back to a local
OpenAI-compatible LLM at `LOCAL_LLM_BASE_URL` (Ollama — see [Local LLM (offline
AI)](../README.md#local-llm-offline-ai) in the root README for setup). With no
backend configured, recommendation calls return `503`; when the configured
backend is unreachable or returns an unparsable response, they return `502`.

## Configuration

Settings come from the environment (`advisor/config.py`, pydantic-settings):

| Env var | Purpose | Default |
|---------|---------|---------|
| `DATABASE_URL` | Async SQLAlchemy Postgres URL | local dev database |
| `AI_API_KEY` | Hosted provider API key; empty enables the local fallback | empty |
| `AI_BASE_URL` | Hosted provider endpoint (OpenAI-compatible, HTTPS) | `https://api.openai.com/v1` |
| `AI_CHAT_MODEL` | Hosted chat model | `gpt-5.4-mini` |
| `LOCAL_LLM_BASE_URL` | Fallback OpenAI-compatible endpoint; empty disables the fallback | empty |
| `LOCAL_LLM_MODEL` | Fallback model | `llama3.2` |
| `AI_EMBEDDING_MODEL` / `LOCAL_EMBEDDING_MODEL` | Embedding models for news RAG (hosted / local) | `text-embedding-3-small` / `nomic-embed-text` |
| `RABBITMQ_URL` or `RABBITMQ_HOST/PORT/USERNAME/PASSWORD` | News broker connection; unset disables the consumer | unset |
| `NEWS_QUEUE` | Producer-owned queue to consume | `news.articles` |
| `NEWS_RETENTION_DAYS` / `NEWS_RETENTION_SWEEP_INTERVAL_SECONDS` | News store retention (0 days disables the sweeper) | `7` / `3600` |
| `KEYCLOAK_ISSUER` / `KEYCLOAK_JWK_SET_URI` / `KEYCLOAK_AUDIENCE` | Token validation | local dev realm |

## Database

The service owns a dedicated Postgres instance (compose `ai-db`, its own
StatefulSet in the Helm chart) storing the recommendation history. Schema
migrations live in `migrations/` and are managed with Alembic
(`uv run alembic upgrade head`); compose runs them via the one-shot
`ai-migrate` service before the app starts, and tests run against SQLite
in-memory.

## OpenAPI / Generated Client

The TypeScript client is generated from this service's OpenAPI spec:

```sh
uv run export-openapi    # writes docs/openapi.json from the FastAPI app
```

After changing any route or request/response model, run `uv run export-openapi`,
then `npm run generate:api` in `client/` (regenerates `client/src/network/generated-ai/`),
and commit the result. CI's `openapi-sync` workflow fails if the committed files
are out of sync.

## Financial news (RAG)

`POST /ai/advisor/recommendation` grounds its advice in relevant financial news
retrieved from a pgvector store, ingested by a background consumer and matched to the
caller's holdings at generation time.

The agent specifications (recommendation agent, news ingest consumer, and the
producer-owned queue contract) live in the root [`AGENTS.md`](../AGENTS.md#ai-agents),
the single source of truth for agent documentation.

## Observability

The service is instrumented with `opentelemetry-distro` /
`opentelemetry-instrument` (FastAPI, logging, aio-pika, and SQLAlchemy
instrumentation); in deployments with observability enabled, traces and
metrics are pushed via OTLP to the shared LGTM stack. The news consumer also
emits custom ingest metrics — `kontor_news_messages_consumed_total`
(labeled by outcome: `stored`, `retried`, `invalid`, `dead_lettered`) and the
`kontor_news_embedding_duration_seconds` histogram (labeled by embedding
model) — visualized in the **News Pipeline & Embedding Store** Grafana
dashboard alongside postgres_exporter metrics from the pgvector database. See
[`deploy/helm/observability/README.md`](../deploy/helm/observability/README.md).

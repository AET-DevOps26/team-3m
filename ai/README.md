# Kontor AI

FastAPI service powering Kontor's GenAI layer.
Python 3.14, managed with [uv](https://docs.astral.sh/uv/).

## Getting Started

```sh
uv sync                                       # install dependencies
uv run uvicorn advisor.main:app --reload      # dev server on http://localhost:8000
```

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

The `POST /ai/advisor/recommendation` usecase grounds its advice in relevant
financial news retrieved from a pgvector store. News is ingested by a background
consumer and matched to the caller's holdings at generation time.

### Ingest

A background consumer (started in the FastAPI `lifespan` when `RABBITMQ_URL` is set)
subscribes to a RabbitMQ queue, embeds each article, and upserts it into the
`news_article` table (pgvector). Each row also stores the embedding model + dimension,
so switching embedding provider never mixes vector dimensions at query time.

Embeddings mirror the LLM provider resolution: **Logos** in hosted mode
(`LOGOS_API_KEY` + `LOGOS_EMBEDDING_MODEL`), else **Ollama** (`LOCAL_EMBEDDING_MODEL`,
default `nomic-embed-text`).

### Retrieval

At generation time the service retrieves news via a **hybrid** query: articles whose
`symbols` overlap the portfolio's tickers (works even without embeddings), unioned with
the nearest news by cosine similarity to a query built from the holdings. The retrieved
articles are injected into the prompt as untrusted data; the response carries a
`news_summary` and server-built `news_references` (grounded citations).

### Queue contract (owned by the queue service — not this repo)

The RabbitMQ broker, exchange, queue, bindings, and any dead-letter setup are
provisioned by a separate service. This consumer only subscribes to the queue named by
`NEWS_QUEUE` (default `kontor.news.ai`), declaring it **passively** (fails fast if
absent). `RABBITMQ_URL` may carry TLS/vhost/credentials; the service manages no broker
topology or secrets beyond consuming that URL.

Message body is JSON and the schema is intentionally open — unknown fields are tolerated
(`extra="allow"`). The only hard requirement is a `title` or `content`.

| Field            | Type      | Notes                                            |
| ---------------- | --------- | ------------------------------------------------ |
| `schema_version` | int       | Defaults to 1.                                   |
| `title`          | string    | Title or content required.                       |
| `content`        | string    | Title or content required.                       |
| `external_id`    | string    | Optional; used for idempotency when present.     |
| `url`            | string    | Optional.                                        |
| `source`         | string    | Optional.                                        |
| `published_at`   | string    | Optional; ISO-8601.                              |
| `symbols`        | string[]  | Optional; tickers, normalized to uppercase.      |

Delivery is assumed at-least-once; ingest is idempotent (dedupe by `content_hash`, and
by `external_id` when present). A message that never parses is rejected without requeue
(dead-lettered only if the upstream queue is configured with a DLX). The consumer runs
in the API process and is best-effort: a broker or embedding fault never affects the
recommendation API.

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

A background consumer (started in the FastAPI `lifespan` when a RabbitMQ URL or host is configured)
subscribes to a RabbitMQ queue, embeds each article, and upserts it into the
`news_article` table (pgvector). Each row also stores the embedding model + dimension,
so switching embedding provider never mixes vector dimensions at query time.

Embeddings mirror the LLM provider resolution: **Logos** in hosted mode
(`LOGOS_API_KEY` + `LOGOS_EMBEDDING_MODEL`), else **Ollama** (`LOCAL_EMBEDDING_MODEL`,
default `nomic-embed-text`).

### Retrieval

At generation time the service retrieves the nearest news by cosine similarity to a
query built from the holdings. The repository also supports optional symbol metadata,
but the bundled aggregator currently publishes article text without ticker tags. The
retrieved articles are serialized as delimiter-safe JSON and injected into the prompt
as untrusted data; the response carries a `news_summary` and server-built
`news_references` (grounded citations).

### Queue contract

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
then rejected into the bounded `news.articles.dead` queue for inspection instead of cycling indefinitely.
The consumer runs in the API process and remains isolated from recommendation serving.

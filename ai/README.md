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

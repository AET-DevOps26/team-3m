# Models

Design models for _Kontor_, in two categories:

- **Problem-domain models** describe the _intended product_ (full scope from
  [`../PROBLEM_STATEMENT.md`](../PROBLEM_STATEMENT.md)). They **intentionally model
  requirements that are not implemented yet** — don't read them as as-built.
- **Solution / architecture models** describe the _system as built_ and should
  track the code.

| Model | File | Category |
|-------|------|----------|
| Use Case Diagram | `USE_CASE_DIAGRAM.{json,svg}` | Problem domain |
| Analysis Object Model | `ANALYSIS_OBJECT_MODEL.{json,svg}` | Problem domain |
| Component Diagram | `COMPONENT_DIAGRAM.{json,svg}` | Solution / architecture |
| Deployment Diagram | `DEPLOYMENT_DIAGRAM.{json,svg}` | Solution / architecture |

## What's actually built

Implemented today: CSV import → transactions (list/filter/category) → portfolio
overview + value-over-time chart → market data (Twelve Data search/quote/history)
→ AI portfolio recommendation, plus a news aggregator that crawls RSS and
publishes to RabbitMQ.

Modeled but **not** implemented: performance metrics (return/volatility/IRR),
allocation & benchmark comparison, dividends, watchlist, price alerts, tax
(exemption/summary), budget envelopes, spending trends, and the news-driven RAG
advisor (the built advisor uses only a portfolio payload — no news, no
embeddings).

## Architecture-model drift to correct

- **Component Diagram:** `Tax`, `Budgeting`, `News Processor`, and `Watchlist`
  are not built; `Stock Search` actually lives in `core` (`core/marketdata`), not
  the news service; there is no `User/Auth` component (it exists in code).
- **Deployment Diagram:** AI Postgres is the plain `postgres` image (not
  pgvector); the AI → RabbitMQ (`consume news.articles`) edge is not implemented;
  the AI → Logos "+ embeddings" label is aspirational.

## Editing

The `.json` files are [Apollon](https://apollon.ese.in.tum.de/) sources; the
`.svg` files are exported renders — re-export after editing a `.json`. Update
this README as requirements move from planned to built.

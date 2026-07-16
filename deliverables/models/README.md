# Models

Design models for _Kontor_, in two categories:

- **Problem-domain models** describe the _intended product_ (full scope from
  [`../PROBLEM_STATEMENT.md`](../PROBLEM_STATEMENT.md)). They **intentionally model
  all requirements some of which are not implemented yet**
- **Solution / architecture models** describe the _system as built_ and should
  track the code.

| Model                           | File                                       | Category                         |
| ------------------------------- | ------------------------------------------ | -------------------------------- |
| Use Case Diagram                | `USE_CASE_DIAGRAM.{json,svg}`              | Problem domain                   |
| Analysis Object Model           | `ANALYSIS_OBJECT_MODEL.{json,svg}`         | Problem domain                   |
| Component Diagram (Vision)      | `COMPONENT_DIAGRAM_VISION.{json,svg}`      | Solution / architecture (Vision) |
| Component Diagram (Implemented) | `COMPONENT_DIAGRAM_IMPLEMENTED.{json,svg}` | Solution / architecture          |
| Deployment Diagram              | `DEPLOYMENT_DIAGRAM.{json,svg}`            | Solution / architecture          |

The Component Diagram comes in two variants: **Vision** shows the full intended
component set (including unbuilt parts), and **Implemented** shows only what
exists in the code today.

## What's actually built

Implemented today: CSV import → transactions (list/filter/category) → portfolio
overview + value-over-time chart → market data (Twelve Data search/quote/history)
→ AI portfolio recommendation. A news aggregator crawls RSS and publishes to
RabbitMQ (`news.articles`); the AI service consumes that queue, embeds articles
into a pgvector store, and returns news-grounded recommendation summaries
(the `News Processor` RAG path).

Modeled but **not** implemented: performance metrics (return/volatility/IRR),
allocation & benchmark comparison, dividends, watchlist, price alerts, tax
(exemption/summary), budget envelopes, and spending trends.

## Architecture-model status

- **Component Diagram (Implemented):** the component set matches the code.
- **Deployment Diagram:** the component set matches the code.

## Editing

The `.json` files are [Apollon](https://apollon.ese.in.tum.de/) sources; the
`.svg` files are exported renders — re-export after editing a `.json`. Update
this README as requirements move from planned to built.

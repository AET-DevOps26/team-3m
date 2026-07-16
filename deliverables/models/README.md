# Models

Design models for _Kontor_, grouped into two kinds:

- **Problem-domain models** capture the _intended product_ — the full set of
  requirements from [`../PROBLEM_STATEMENT.md`](../PROBLEM_STATEMENT.md). They
  deliberately include features that are not built yet, so read them as scope,
  not as a description of the running system.
- **Solution / architecture models** describe the _system as built_ and are kept
  in sync with the code.

| Model                           | File                                       | Kind                             |
| ------------------------------- | ------------------------------------------ | -------------------------------- |
| Use Case Diagram                | `USE_CASE_DIAGRAM.{json,svg}`              | Problem domain                   |
| Analysis Object Model           | `ANALYSIS_OBJECT_MODEL.{json,svg}`         | Problem domain                   |
| Component Diagram (Vision)      | `COMPONENT_DIAGRAM_VISION.{json,svg}`      | Solution / architecture (Vision) |
| Component Diagram (Implemented) | `COMPONENT_DIAGRAM_IMPLEMENTED.{json,svg}` | Solution / architecture          |
| Deployment Diagram              | `DEPLOYMENT_DIAGRAM.{json,svg}`            | Solution / architecture          |

The Component Diagram exists in two variants: **Vision** shows the full intended
component set (including unbuilt parts), while **Implemented** shows only what
exists in the code today.

## What's actually built

CSV import → transactions (list / filter / category) → portfolio overview and
value-over-time chart → market data (Twelve Data search, quotes, history) → AI
portfolio recommendation. Separately, a news aggregator crawls RSS and publishes
to RabbitMQ (`news.articles`); the AI service consumes that queue, embeds
articles into a pgvector store, and returns news-grounded recommendation
summaries (the `News Processor` RAG path).

**Modeled but not built yet:** performance metrics (return / volatility / IRR),
allocation and benchmark comparison, dividends, watchlist, price alerts, tax
(exemption tracking, summaries), budget envelopes, and spending trends.

## Keeping the models in sync

The **Implemented Component Diagram** and the **Deployment Diagram** track the
current code, update them whenever the running system changes.

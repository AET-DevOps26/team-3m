# Models

This folder holds the design models for _Kontor_. They fall into two categories
with different purposes, and it matters which is which when you read them:

- **Problem-domain models** describe the _intended product_ — the full scope of
  requirements from [`../PROBLEM_STATEMENT.md`](../PROBLEM_STATEMENT.md). They
  deliberately model requirements that have **not been implemented yet**.
- **Solution / architecture models** describe the _system as built_ — the actual
  services, components, and deployment topology in this repository.

> **Read this first:** the problem-domain models are ahead of the code on
> purpose. Do not treat every class, use case, or component in them as something
> that already exists. The "Implementation status" tables below are the source
> of truth for what is actually built.

| Model | File | Category |
|-------|------|----------|
| Use Case Diagram | `USE_CASE_DIAGRAM.{json,svg}` | Problem domain |
| Analysis Object Model | `ANALYSIS_OBJECT_MODEL.{json,svg}` | Problem domain |
| Component Diagram | `COMPONENT_DIAGRAM.{json,svg}` | Solution / architecture |
| Deployment Diagram | `DEPLOYMENT_DIAGRAM.{json,svg}` | Solution / architecture |

---

## Problem-domain models (scope ahead of implementation)

These two model the target product. They are faithful to the problem statement,
so they include requirements that are planned but not yet built.

### Use Case Diagram

Models the full set of functional requirements. Roughly half the use cases are
implemented today.

| Use case | Status |
|----------|--------|
| Import Transactions | ✅ Implemented |
| View Portfolio Overview | ✅ Implemented |
| View Performance Charts | ✅ Implemented (value-over-time snapshots) |
| View Asset Details | ✅ Implemented (Twelve Data) |
| Consult AI Advisor | ✅ Implemented (portfolio recommendation) |
| Categorise Transactions | ⚠️ Partial — category comes from the CSV and is filterable; no user-defined budget envelopes |
| View Performance Metrics | ❌ Not implemented — no total return / volatility / IRR |
| View Portfolio Allocation | ❌ Not implemented — no sector/country breakdown |
| Compare Portfolio Against Benchmark | ❌ Not implemented |
| View Dividend Calendar | ❌ Not implemented |
| Manage Watchlist | ❌ Not implemented |
| Compare Assets | ❌ Not implemented |
| Set Price Alert | ❌ Not implemented |
| Track Tax Exemption Usage | ❌ Not implemented |
| View Tax Summary | ❌ Not implemented |
| Get Expense Suggestions | ❌ Not implemented |
| View Spending Trends | ❌ Not implemented |

### Analysis Object Model

Models the domain concepts behind the requirements. It is a strong domain model
but is well ahead of the persisted data model.

| Class | Status |
|-------|--------|
| `User` | ⚠️ Partial — only `riskTolerance` + OIDC identity exist; `financialGoals` and `preferredLocale` are not persisted |
| `FinancialTransaction` | ✅ Implemented |
| `Portfolio` / `Position` | ✅ Implemented (`Position` → `PortfolioHolding`) |
| `Asset` / `AssetPrice` | ✅ Implemented (via Twelve Data) |
| `Recommendation` | ⚠️ Partial — persisted as a flat record (recommendation, rationale, risk tolerance) generated from a portfolio payload; no RAG |
| `FinancialAccount` | ❌ Not a distinct entity — transactions carry `account_type` directly |
| `Performance` | ❌ Not a metrics object — only raw snapshots exist |
| `Question` / `FinancialInsight` | ❌ Not implemented |
| `FinancialNews` (as an advisor input) | ❌ Not implemented — the AI service does not consume news |
| `BudgetEnvelope` | ❌ Not implemented |
| `Dividend` | ❌ Not implemented |
| `Watchlist` / `PriceAlert` | ❌ Not implemented |
| `TaxAllowance` / `TaxEvent` / `TaxSummary` | ❌ Not implemented |

> **Note on the AI advisor:** the analysis model shows a RAG-style chain
> (`Question → FinancialInsight → Recommendation` drawing on transactions,
> positions, **and news**). The built advisor generates a recommendation purely
> from a portfolio payload — there is no `Question`/`FinancialInsight` entity,
> no news retrieval, and no embeddings.

---

## Solution / architecture models (should track the code)

These describe the system as built and should stay in sync with the repository.
A few parts are currently ahead of or out of step with the implementation —
noted here until the diagrams are corrected.

### Component Diagram

Represents the running services. Known gaps versus the code:

- `Tax` and `Budgeting` (under Kontor) — **not implemented**; no such packages in `core`.
- `News Processor` (under Kontor AI) — **not implemented**; the AI service has no
  RabbitMQ consumer and does no news processing.
- `Watchlist` (under Market News & Research) — **not implemented**.
- `Stock Search` is shown under "Market News & Research", but market data
  (Twelve Data: search/quote/history) actually lives in **`core`** (`core/marketdata`).
- No component represents **User/Auth** (`core/user` + `core/security` + Keycloak),
  which does exist.

The system as built today is: **core** = Transactions + Portfolio + Market Data +
User/Auth; **ai** = Advisor; **news** = News Aggregator (RSS crawl → RabbitMQ).

### Deployment Diagram

Matches the Helm chart (`deploy/helm/kontor/`) and Compose topology closely.
Exceptions to correct:

- **AI Postgres** uses the plain `postgres` image and stores only recommendation
  history — it is **not** pgvector. (Core Postgres genuinely uses the
  `pgvector/pgvector` image, though vector features are not used yet.)
- The **AI → RabbitMQ** edge ("consume `news.articles`") is **not implemented** —
  the AI service has no AMQP client.
- The **AI → Logos LLM** edge label "+ embeddings" is aspirational — the service
  only makes chat-completion calls.

---

## Editing the models

The `.json` files are [Apollon](https://apollon.ese.in.tum.de/) diagram sources;
the `.svg` files are exported renders. When you change a `.json`, re-export the
matching `.svg`. When a requirement moves from planned to built, update the
relevant "Status" row above so this README stays trustworthy.

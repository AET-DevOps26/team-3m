# Kontor — Tester Guide

Minimal steps to test Kontor from a fresh clone, plus the URLs and features to
check. Details live in the [root README](../README.md).

## 1. Local setup (fresh clone)

Only prerequisite: Docker with Compose v2.

```sh
git clone git@github.com:AET-DevOps26/team-3m.git
cd team-3m
cp .env.example .env
docker compose up --build
```

The first build takes a few minutes. Open <http://localhost:5173> and sign in
as **`dev` / `dev`** — pre-seeded with transactions and a portfolio. Other
seeded users: `analyst`, `admin-user` (has `kontor-admin` for news
aggregation), password `dev`.

Two optional `.env` keys unlock external integrations — see the root README:

- `TWELVE_DATA_API_KEY` — live market data ([Market data](../README.md#market-data-twelve-data)); without it market endpoints return `502`.
- `LOGOS_API_KEY` — hosted LLM, or an Ollama fallback ([Local LLM](../README.md#local-llm-offline-ai)); with neither, recommendations return `503`.

Optional local observability stack ([Observability](../README.md#observability)):

```sh
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

## 2. URLs

### Local

| Service | URL |
|---------|-----|
| Client (web app) | <http://localhost:5173> |
| Core API | <http://localhost:8080> |
| AI service | <http://localhost:8000> |
| News service | <http://localhost:8082> |
| Keycloak (`admin`/`admin`) | <http://localhost:8081> |
| Grafana (`admin`/`admin`, overlay only) | <http://localhost:3001> |

### Swagger / API docs

| Service | Local | Prod |
|---------|-------|------|
| Core | <http://localhost:8080/swagger-ui/index.html> | <https://kontor.live/swagger-ui/index.html> |
| News | <http://localhost:8082/news/swagger-ui/index.html> | <https://kontor.live/news/swagger-ui/index.html> |
| AI | <http://localhost:8000/ai/docs> | <https://kontor.live/ai/docs> |

All endpoints require a Keycloak bearer token except the health probes.

### Production

| What | URL |
|------|-----|
| Web app | <https://kontor.live> |
| Keycloak | <https://auth.kontor.live> (admin console under `/admin`, realm `kontor`) |
| Grafana | <https://grafana.kontor.live> |
| Azure single-VM deployment | <https://azure.kontor.live> |

Prod is **not** seeded — register an account and import the sample CSV
(`resources/example-data/transaction-csv.example.csv`).

### PR preview environments

Add the `deploy:preview` label to a PR → ephemeral environment in
`team-3m-pr-<N>` (torn down on label removal / PR close). Login `dev`/`dev`.

| What | URL |
|------|-----|
| Web app | `https://pr-<N>.team-3m.stud.k8s.aet.cit.tum.de` |
| Keycloak | `https://auth.pr-<N>.team-3m.stud.k8s.aet.cit.tum.de` |

## 3. What to test

- **Auth** — login via the custom Kontor Keycloak theme, protected routes
  redirect, token refresh.
- **Portfolio dashboard (`/`)** — holdings, performance chart (live Twelve
  Data prices), and the **AI recommendation** card — generated advice cites
  financial news (RAG over the pgvector news store).
- **Transactions (`/transactions`)** — list/filter, create, **CSV import**
  (sample file above; import *replaces* existing transactions), validation
  errors on bad input.
- **Markets (`/markets`, `/markets/<symbol>`)** — symbol search, quotes, price
  history. Free-tier rate limits show a "Live market data paused" notice
  (`429`) — expected.
- **News pipeline** — as `admin-user`, `POST /api/v1/news/aggregation/runs`
  via the news Swagger UI returns `202`; poll the run until `SUCCEEDED`. The
  AI service consumes and embeds the articles; watch this live on the
  RabbitMQ and News Pipeline dashboards in Grafana. A second run publishes 0 items (dedup); a
  concurrent trigger returns `409`.
- **Degradation** — missing Twelve Data key → `502`; no LLM backend → `503`;
  LLM unreachable → `502`. The app stays usable throughout.

## 4. What to see in Grafana

One shared stack for **all** environments — switch the
`deployment_environment` variable between `prod`, `pr-<N>`, and `local`.

- **Dashboards** — Fleet Overview, Backend Runtime (JVM), Traces, Service
  Logs, Client RUM (Faro Web Vitals, browser errors), Keycloak, RabbitMQ
  (broker queue depth / message rates), and News Pipeline (articles consumed,
  embedding latency, AI Postgres/pgvector health).
- **Signals** — traces in Tempo, pod logs in Loki (log lines carry `trace_id`
  for logs ↔ traces pivoting), metrics in Prometheus.
- **Alerting** — provisioned rules (service down, error rate, p95 latency,
  log spikes, JVM pressure) fire to Discord, prod only.

## 5. What to see in Keycloak

Admin console: <https://auth.kontor.live/admin> (local:
<http://localhost:8081>, `admin`/`admin`), realm **`kontor`**.

- **Custom login theme** — Kontor-branded Keycloakify theme baked into a
  custom image (`loginTheme: kontor`).
- **Realm roles** — `kontor-user` (standard) and `kontor-admin` (news
  aggregation trigger).
- **Clients** — `kontor-spa` (the SPA, audience `kontor-api`); in prod also
  `grafana` for Grafana SSO.
- **Security** — brute-force protection, 5-minute access tokens,
  self-registration enabled in prod only, seeded users only outside prod.

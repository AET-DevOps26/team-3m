# Kontor News Aggregator

Crawls market news from public RSS feeds and **pushes every new article onto a
RabbitMQ queue** for the future **news processor** (the component that will do
embeddings/chunking/RAG — out of scope here). Locally the aggregator stores only
**crawl metadata**, so it never publishes the same article twice and only
crawls what is new. The current feed set is an intentionally simple placeholder
source, meant to be replaced later.

## How it works

- **Scheduled aggregation**: every `news.aggregation.interval` (default 15 min)
  all configured feeds are fetched and parsed (RSS/Atom via ROME).
- **Manual asynchronous aggregation**: `POST /api/v1/news/aggregation/runs`
  starts a run in the background and returns `202` with the run to poll
  (`GET /api/v1/news/aggregation/runs/{id}`). A second trigger while a run is
  in flight gets `409`. Triggering requires the `kontor-admin` role and is
  rate-limited. A Postgres advisory lock prevents overlap across replicas.
- **Dedup**: each item's normalized URL (tracking params stripped) is hashed
  (SHA-256); hashes already marked *pushed* in `crawled_article` are skipped
  before any crawling happens.
- **Safe, bounded crawling**: only public HTTPS targets are fetched; redirect
  targets are revalidated, response sizes are capped, and private/link-local
  addresses are rejected. Full-text extraction remains best effort.
- **Publish with confirms**: one persistent JSON message per article on the
  durable queue `news.articles` (topic exchange `kontor.news`, routing key
  `news.article.crawled`), `messageId` = URL hash. The metadata row is marked
  `pushed_at` **only after the broker confirms and the mandatory publish was
  routable**; unconfirmed or returned articles are
  re-crawled and re-published on the next run (at-least-once delivery — the
  consumer dedups on `messageId`).

## Contract for the news processor

The contract is the **queue**, documented in [`docs/asyncapi.yml`](docs/asyncapi.yml):
subscribe to `news.articles`, treat delivery as at-least-once, deduplicate on
`messageId`/`id`. The aggregator declares the durable topology itself, so
messages accumulate until the processor exists. Inspect the queue via the
RabbitMQ management UI (`http://localhost:15672`, credentials from `.env`).

No embeddings and no chunking happen here by design — both are coupled to the
embedding model the processor will choose.

## Storage

`crawled_article` holds metadata only (url, url_hash, source, title,
timestamps, `pushed_at`); `aggregation_run` tracks run status and counts. The
service uses its **own database and role** (`news`) in the shared Postgres
instance. The Compose init service and Helm provisioning Job reconcile the role
and database on every deployment, including existing volumes and password
changes.

## Configuration

| Property | Env override | Default |
|----------|--------------|---------|
| `news.aggregation.feeds[]` | — (edit yaml/profile or Helm `news.aggregation.feeds`) | Yahoo Finance + MarketWatch |
| `news.aggregation.scheduler-enabled` | `NEWS_AGGREGATION_SCHEDULER_ENABLED` | `true` |
| `news.aggregation.interval` | `NEWS_AGGREGATION_INTERVAL` | `PT15M` |
| `news.aggregation.initial-delay` | `NEWS_AGGREGATION_INITIAL_DELAY` | `PT1M` |
| `news.aggregation.fetch-full-text` | `NEWS_AGGREGATION_FETCH_FULL_TEXT` | `true` |
| `news.aggregation.manual-trigger-min-interval` | — | `PT30S` |
| `news.http.timeout` | `NEWS_HTTP_TIMEOUT` | `PT10S` |
| `news.http.max-feed-bytes` | `NEWS_HTTP_MAX_FEED_BYTES` | 1 MiB |
| `news.http.max-article-bytes` | `NEWS_HTTP_MAX_ARTICLE_BYTES` | 2 MiB |
| `news.messaging.*` (exchange/queue/routing key) | — | `kontor.news` / `news.articles` / `news.article.crawled` |
| RabbitMQ | `RABBITMQ_HOST/PORT/USERNAME/PASSWORD` | `localhost:5672`, `news` |
| Database | `NEWS_POSTGRES_HOST/PORT/DB/USER/PASSWORD` | `localhost:5432/news` |
| Keycloak | `KEYCLOAK_ISSUER/JWK_SET_URI/AUDIENCE` | local dev realm |

Helm exposes `news.aggregation.schedulerEnabled`, `interval`, `initialDelay`,
`fetchFullText`, and the complete `feeds` list as typed values. Set
`schedulerEnabled: false` for manual-only operation.

## Commands

| Task | Command |
|------|---------|
| Build | `./gradlew build` |
| Test | `./gradlew test` (Testcontainers: Postgres + RabbitMQ) |
| Compile check | `./gradlew compileJava` |
| Format check | `./gradlew spotlessCheck` |
| Format fix | `./gradlew spotlessApply` |
| Lint | `./gradlew checkstyleMain checkstyleTest` |
| Run locally | `./gradlew bootRun` (needs compose `db`, `keycloak`, `rabbitmq`) |

## Manual testing

Everything runs locally with compose. If ports 5432/8081 are taken on your
machine, override them: `POSTGRES_PORT=15432 KEYCLOAK_PORT=18081 docker compose up -d news`
(the values below assume the defaults).

1. **Start the stack** (db, keycloak, rabbitmq, news):

   ```bash
   docker compose up -d --build news
   ```

   The `news-db-init` dependency creates or updates the news role before the
   service starts, including on an existing volume.

2. **Get a token.** The `kontor-spa` client has direct access grants disabled by
   default; for local testing either enable them once in the Keycloak admin UI
   (`http://localhost:8081`, admin/admin → Clients → kontor-spa → Capability
   config → Direct access grants) or copy an access token from the SPA's
   browser dev tools after logging in as `admin-user`/`dev`. The seeded
   `admin-user` has the required `kontor-admin` realm role. With grants enabled:

   ```bash
   TOKEN=$(curl -s -X POST "http://localhost:8081/realms/kontor/protocol/openid-connect/token" \
     -d "grant_type=password&client_id=kontor-spa&username=admin-user&password=dev" | jq -r .access_token)
   ```

3. **Trigger and watch a run:**

   ```bash
   curl -s -X POST http://localhost:8082/api/v1/news/aggregation/runs -H "Authorization: Bearer $TOKEN"
   # → 202 with a run id; poll it:
   curl -s http://localhost:8082/api/v1/news/aggregation/runs/<id> -H "Authorization: Bearer $TOKEN"
   # → status SUCCEEDED with itemsSeen/itemsPublished counts
   ```

4. **See the messages**: open the RabbitMQ management UI at
   `http://localhost:15672` (credentials from `.env`, default `news`/
   `change-me-rabbit-local`) → Queues → `news.articles`. The message count matches
   `itemsPublished`; "Get messages" shows the JSON payload and `message_id`.

5. **Verify dedup**: trigger a second run — it finishes with
   `itemsPublished: 0` and the queue depth is unchanged. The metadata is in
   Postgres: `docker compose exec db psql -U news -d news -c
   'SELECT source, title, pushed_at FROM crawled_article LIMIT 5'`.

6. **Overlap guard**: fire two `POST` requests back-to-back — the second
   returns `409` while the first is in flight.

7. **Broker-down recovery**: `docker compose stop rabbitmq`, trigger a run
   (items are seen but not published, error recorded), then
   `docker compose start rabbitmq` and re-trigger — the previously unpushed
   articles are published now.

8. **Scheduler**: with no manual trigger, the first scheduled run fires ~1 min
   after startup (`docker compose logs -f news`), then every 15 min.

## Follow-ups

- Retention job for old `crawled_article`/`aggregation_run` rows.
- Cross-source dedup (same story under different URLs on multiple feeds is published twice).
- RabbitMQ metrics into the shared LGTM stack (prometheus plugin + Alloy scrape).

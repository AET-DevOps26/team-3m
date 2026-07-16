# Kontor Core

The main Spring Boot API behind the Kontor client: user profiles, financial
transactions (including CSV import), portfolio analytics, and live stock/ETF
market data via [Twelve Data](https://twelvedata.com). Java 25, Spring Boot 4,
Gradle.

## API

All endpoints live under `/api/v1` and require a Keycloak bearer token, except
the health probes:

| Base path | Purpose |
|-----------|---------|
| `/api/v1/financial-transactions` | Transaction CRUD + CSV import (multipart, 10 MB limit) |
| `/api/v1/portfolio` | Portfolio overview and performance |
| `/api/v1/market-data` | Symbol search, metadata, quotes, price history (Twelve Data) |
| `/api/v1/profile` | User profile and risk tolerance |
| `/api/v1/health` | Health probes (no auth) |

Springdoc serves the Swagger UI at `/swagger-ui/index.html` and the live spec
at `/v3/api-docs`. The committed spec `docs/openapi.yml` is generated from the
annotated controllers via `./gradlew generateOpenApiDocs` and feeds the
TypeScript client (`npm run generate:api` in `client/` — CI's `openapi-sync`
workflow fails if the committed files are out of sync).

## Configuration

| Property | Env override | Default |
|----------|--------------|---------|
| Database | `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | `localhost:5432/team3m` |
| `kontor.security.issuer` | `KEYCLOAK_ISSUER` | local dev realm |
| JWT JWK set | `KEYCLOAK_JWK_SET_URI` | local dev realm |
| `kontor.security.audience` | `KEYCLOAK_AUDIENCE` | `kontor-api` |
| `kontor.market-data.base-url` | `MARKET_DATA_BASE_URL` | `https://api.twelvedata.com` |
| `kontor.market-data.api-key` | `TWELVE_DATA_API_KEY` | empty |
| Reported app version | `APP_VERSION` | `dev` |

When `TWELVE_DATA_API_KEY` is empty, market-data endpoints return `502` with a
message that the key is not configured; Twelve Data rate limits (`429`) are
passed through to the client. The rest of the API works without the key.

## Database

The service owns the primary Postgres instance (`pgvector` image) and manages
its schema with Flyway (`src/main/resources/db/migration`). The `seed` profile
additionally applies `db/seed` (repeatable migration with example transactions
and portfolio data for the local `dev` user); the compose `core` service runs
with `SPRING_PROFILES_ACTIVE=seed`.

## Commands

| Task | Command |
|------|---------|
| Build | `./gradlew build` |
| Test | `./gradlew test` |
| Compile check | `./gradlew compileJava` |
| Format check | `./gradlew spotlessCheck` |
| Format fix | `./gradlew spotlessApply` |
| Lint | `./gradlew checkstyleMain checkstyleTest` |
| Regenerate OpenAPI spec | `./gradlew generateOpenApiDocs` |
| Run locally | `./gradlew bootRun` (needs compose `db` and `keycloak`) |

## Observability

The Docker image bakes the OpenTelemetry Java agent into `/app/otel`
(checksum-verified at build). It is inert by default; deployments attach it via
`JAVA_TOOL_OPTIONS=-javaagent:/app/otel/opentelemetry-javaagent.jar` — the Helm
chart does this when `observability.enabled=true`, and locally the
`docker-compose.observability.yml` overlay does the same. See
[`deploy/helm/observability/README.md`](../deploy/helm/observability/README.md).

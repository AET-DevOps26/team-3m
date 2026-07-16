# Kontor Client

React SPA for Kontor. React 19, TypeScript 6, Vite 8, Tailwind CSS 4,
shadcn/ui, served by nginx in production.

## Getting Started

```sh
npm install
npm run dev        # dev server on http://localhost:5173
```

The dev server expects the backend stack from the repo root
(`docker compose up`) — see the [root README](../README.md) for the full local
setup including Keycloak login users.

## Tasks

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run typecheck` |
| Unit tests | `npm test` |
| Unit tests (watch) | `npm run test:watch` |
| Unit tests (coverage) | `npm run test:coverage` |
| E2E tests | `npm run e2e` |
| Lint | `npm run lint` |
| Lint (autofix) | `npm run lint:fix` |
| Format (autofix) | `npm run format` |
| Regenerate API client | `npm run generate:api` |

## Testing

- **Unit tests** — Vitest (`vitest.config.ts`, setup in `vitest.setup.ts`),
  colocated `*.test.ts(x)` files under `src/`.
- **E2E tests** — Playwright specs in `e2e/` (`playwright.config.ts`). The base
  URL defaults to `http://localhost:5173` and can be overridden with
  `E2E_BASE_URL`; `auth.setup.ts` logs in through Keycloak first, so the full
  compose stack must be running.

## Generated API clients

`src/network/generated/` (core) and `src/network/generated-ai/` (AI) are
generated from the backends' committed OpenAPI specs — never edit them by
hand. After a backend route or DTO changes, regenerate the spec there
(`./gradlew generateOpenApiDocs` in `core/`, `uv run export-openapi` in `ai/`),
then run `npm run generate:api` and commit the result. CI's `openapi-sync`
workflow fails if the committed files are out of sync.

## Runtime configuration

The production image is built once and configured at container start:
[`vite-envs`](https://github.com/garronej/vite-envs) rewrites the served
`index.html` from the pod environment, so `VITE_*` values are **not** baked in
at build time. Variables (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Public origin of the backend (no `/api` suffix) |
| `VITE_OIDC_AUTHORITY` | Keycloak issuer URL |
| `VITE_OIDC_CLIENT_ID` | OIDC client ID (default `kontor-spa`) |
| `VITE_OIDC_AUDIENCE` | Expected token audience (default `kontor-api`) |
| `VITE_FARO_COLLECTOR_URL` | Grafana Faro collector endpoint (RUM off when empty) |
| `VITE_OTEL_SERVICE_NAME` | Service name reported with telemetry |
| `VITE_DEPLOYMENT_ENVIRONMENT` | Environment tag (`prod`, `pr-<N>`, `local`) |

## Observability

`src/observability/faro.ts` initializes [Grafana Faro](https://grafana.com/oss/faro/)
browser RUM: Web Vitals, errors, sessions, and traces are pushed to the Alloy
gateway's Faro receiver and land in Loki/Tempo of the shared observability
stack. It only activates when `VITE_FARO_COLLECTOR_URL` is set.

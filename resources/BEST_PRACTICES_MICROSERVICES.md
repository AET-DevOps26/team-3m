# Concrete Tips and Hints

---

## 1. ✅ Microservice Architecture & Design Best Practices

- **Single Responsibility Services:** Each microservice should encapsulate one specific domain or business capability. Avoid feature creep and overlapping responsibilities.
- **Stateless Services:** Design services to be stateless. Store session/context in tokens (e.g., JWT) or shared databases/cache layers like Redis if necessary.
- **Language Boundary Awareness:** Carefully define the interface (OpenAPI spec) between Spring Boot (Java) and Langchain (Python). Use JSON over HTTP, not internal data structures.

---

## 2. 📐 API-Driven Design and OpenAPI Usage

### Design First

Teams should define and review the OpenAPI specs collaboratively before implementing any logic. Use tools like Swagger Editor or Stoplight.

### Use OpenAPI Code Generators

- **Java (Spring Boot):** `springdoc-openapi` or OpenAPI Generator
- **Python:** `openapi-python-client`

### Versioning

Always version APIs (e.g., `/api/v1/resource`) from day one to prevent breaking clients during iteration.

### API-First, Contract-Strong

| Task                    | Concrete Tool / Command                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Edit & lint spec        | `npx @redocly/cli lint api/openapi.yaml` (Spectral rules)                                         |
| Generate Java stubs     | `openapi-generator-cli generate -i api/openapi.yaml -g spring -o services/spring-order/generated` |
| Generate Python client  | `openapi-python-client --path api/openapi.yaml --output services/py-recommender/client`           |
| Generate TypeScript SDK | `npx openapi-typescript api/openapi.yaml -o web-client/src/api.ts`                                |
| Mock server for client  | `npx prism mock api/openapi.yaml` (runs on port 4010)                                             |

Never merge without running the linter; add it to a pre-commit hook.

➡️ pre-commit.com Include `.pre-commit-config.yaml` in your repo and register:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Redocly/openapi-cli
    rev: v1.0.0-beta.92
    hooks:
      - id: openapi-cli-lint
```

Run with:

```bash
pre-commit run -a
```

### Mono-repo Layout

```
repo/
├── api/                   # Single source of truth
│   ├── openapi.yaml       # Versioned spec (v1, v2…)
│   └── scripts/           # helper scripts for code-gen
├── services/
│   ├── spring-order/      # Java 21, Spring Boot 3
│   └── py-recommender/    # Python 3.12, LangChain
├── web-client/            # Any JS framework
├── infra/                 # docker-compose, k8s Helm charts, Terraform
└── .github/workflows/     # CI pipelines
```

The OpenAPI spec lives once in `/api`. Every language consumes it via code-gen. No hand-written DTOs. Use records (immutable) for DTOs in Java.

### 👀 Minimal `gen-all.sh` helper (drop in `/api/scripts`)

```bash
#!/usr/bin/env bash
set -euo pipefail

openapi-generator-cli generate -i api/openapi.yaml -g spring \
  -o services/spring-order/generated --skip-validate-spec

openapi-python-client --path api/openapi.yaml \
  --output services/py-recommender/client --config api/scripts/py-config.json

npx openapi-typescript api/openapi.yaml -o web-client/src/api.ts
```

Make it executable and callable from CI; run `./api/scripts/gen-all.sh` after each spec change.

> 💡 **Tip:** Add a Git hook (`post-checkout`, `post-merge`) to run `./api/scripts/gen-all.sh` automatically. This ensures generated clients are always up-to-date after switching branches or pulling changes.

---

## 3. 🔐 Security Best Practices

- Use OAuth2 / OIDC via API gateway (e.g., Keycloak, GitHub, Auth0).
- Pass JWTs through HTTP headers.
- Each service must verify the token using a shared public key.
- Gateways (like Traefik or NGINX) can centralize token validation.

> 👉 **Tip:** Place the gateway as the entrypoint to intercept and validate tokens before forwarding to services.

---

## 4. ⚙️ Development and Deployment Practices

- **Contract Testing:** Use Pact or similar tools to ensure API contract fidelity between producer (Spring Boot) and consumer (Langchain).
- **Service Discovery:** Use an API gateway (e.g., Traefik, NGINX) to route and secure APIs. Avoid direct service-to-service calls across languages unless encapsulated.
- **Consistent Error Handling:** Use a unified error schema in OpenAPI: `{code, message, details}`. Enforce it across all services and in the OpenAPI spec.
- **CI/CD Pipeline:** Automate OpenAPI linting, stub generation, and testing in GitHub Actions. Always validate that OpenAPI specs match implementation on each build.
- **Docker Image Publishing:** Push container images to a registry with semantic version tags (e.g., `ghcr.io/org/service:1.0.0`) and/or Git commit SHA (`:sha-abc123`) to ensure traceability and reproducibility across environments.

### GitHub Actions Pipeline Example

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches:
      - main
    paths-ignore:
      - "README.md"
  pull_request:

concurrency: ci-${{ github.ref }}

jobs:
  generate-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [spring-order, py-recommender, web-client]

    steps:
      - uses: actions/checkout@v4

      - name: Lint OpenAPI
        run: npx @redocly/cli lint api/openapi.yaml

      - name: Generate code
        run: ./api/scripts/gen-all.sh
        shell: bash

      - name: Cache Maven / npm / pip
        uses: actions/cache@v4
        with:
          path: |
            ~/.m2/repository
            ~/.cache/pip
            ~/.npm
          key: ${{ runner.os }}-${{ hashFiles('**/lockfiles') }}

      - name: Build & test
        working-directory: services/${{ matrix.service }}
        run: |
          case ${{ matrix.service }} in
            spring-order) ./mvnw verify ;;
            py-recommender) pip install -r req.txt && pytest ;;
            web-client) npm ci && npm run test -- --watchAll=false ;;
          esac

  contract-test:
    needs: generate-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pact verification
        run: ./scripts/run-pact.sh
```

### Local Development and Runtime

| Area                | Hands-on Choice                                                                                            | Why                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Service discovery   | Simple API Gateway.                                                                                        | Leads to one ingress, easier CORS, security.                                             |
| Data isolation      | One PostgreSQL database per service (logical schema ok).                                                   | Classic microservice rule → avoids coupling                                              |
| Dev containers      | `devcontainer.json` + VS Code, Docker-in-Docker enabled                                                    | Requires zero local setup.                                                               |
| Local orchestration | Include a file called `docker-compose up` in `/infra`                                                      | Offers DBs + gateway + both services in one command.                                     |
| Cross-service call  | Python → Java via generated TypeScript-style client (`py-recommender/client`).                             | Consistent via OpenAPI through reusing same OpenAPI spec, avoids hidden internal formats |
| Observability       | Spring Boot Actuator + Prometheus; Include LangChain's tracing to OpenTelemetry; Scrape via Docker Compose | Production-grade insights with minimal code.                                             |

---

## 5. 💻 Client Integration

- Import generated `api.ts` in React or similar.
- Runtime base URL comes from `.env` file: `VITE_API_URL=http://localhost:8080`
- For CORS, configure gateway:

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        corsConfigurations:
          "[/**]":
            allowedOrigins: "*"
            allowedMethods: "*"
```

- Use SWR or React Query for caching and retries.

---

## 6. 🤝 Collaboration Best Practices

| Ritual             | Concrete Action                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| API review         | Weekly 15-min sync to review `openapi.yaml` changes                                                                                   |
| Definition of Done | PR must include: ✅ Passing CI, ✅ Updated spec, ✅ Short doc (`/docs/adr-xyz.md`)                                                    |
| Doc automation     | Generate and publish OpenAPI docs with: `redoc-cli bundle api/openapi.yaml -o docs/api.html` → deploy with GH Pages (`/docs` folder). |
| Issue template     | Add checkboxes in the "Describe Changes" section: "Affects API?", "Spec updated?" ; Create a PR template                              |

---

## 7. 🧪 Write Tests

- Consider implementing integration and end-to-end (E2E) tests per microservice.
- These tests should include interactions with the database and any external APIs to ensure that services behave correctly as the system evolves.
- This helps maintain stability and avoid regressions when introducing new features.

---

## 8. 🚫 What Not To Do

- ❌ No direct HTTP calls without generated client
- ❌ No shared DTOs/utilities outside the OpenAPI spec
- ❌ No long-running branches (max 2 days → rebase/merge)
- ❌ No manual production deploys — everything must go through CI/CD

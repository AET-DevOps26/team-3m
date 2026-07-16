# kontor Helm chart

Deploys the Kontor stack into a single Kubernetes namespace:

- **client** — React SPA served by nginx, configured at runtime via `vite-envs`.
- **core** — Spring Boot API.
- **news** — Spring Boot news aggregator with its own dedicated Postgres.
- **ai** — FastAPI GenAI service with its own dedicated Postgres.
- **postgres** — single-instance StatefulSet with `pgvector` (core's database).
- **rabbitmq** — message broker for the news queue (CloudPirates subchart).
- **keycloak** _(optional)_ — bundled identity provider, with its own dedicated
  Postgres or an in-memory H2 for throwaway PR previews.

Designed for the shared AET student cluster (RKE2, nginx ingress, cert-manager,
Ceph RBD storage), but everything is value-driven so it runs on any compliant
cluster.

## Prerequisites

- Namespace `team-3m` exists: `kubectl create namespace team-3m`
- Images pushed to `ghcr.io/aet-devops26/team-3m/kontor-core`, `…/kontor-client`,
  `…/kontor-news`, `…/kontor-ai`, and `…/kontor-keycloak`
- cert-manager `ClusterIssuer` (default `letsencrypt-prod`) available

## Install

```bash
# 1. Copy the secrets template and fill in real passwords.
cp deploy/helm/kontor/secrets.example.yaml deploy/helm/kontor/secrets.yaml
$EDITOR deploy/helm/kontor/secrets.yaml   # gitignored

# 2. Apply the provider key out-of-band so it never enters Helm history.
kubectl create secret generic kontor-ai-provider \
  -n team-3m \
  --from-literal=AI_API_KEY="$AI_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

# 3. Render once to sanity-check.
helm template kontor ./deploy/helm/kontor \
  -n team-3m \
  -f deploy/helm/kontor/secrets.yaml \
  --set-string ai.existingSecret=kontor-ai-provider | less

# 4. Install / upgrade.
helm upgrade --install kontor ./deploy/helm/kontor \
  -n team-3m \
  -f deploy/helm/kontor/secrets.yaml \
  --set-string ai.existingSecret=kontor-ai-provider
```

## Environment overlays

Per-environment, non-secret values live in checked-in files alongside the chart;
secrets always stay in the gitignored `secrets.yaml`.

| File                      | Purpose                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values.yaml`             | Defaults — safe placeholders, every component enabled.                                                                                                                    |
| `values-prod.yaml`        | Production overlay: `kontor.live` + the TUM cluster host, Postgres-backed Keycloak with strict hostname checks.                                                           |
| `values-pr.template.yaml` | Template for an ephemeral PR preview. CI renders it with `envsubst` (`${PR_NUMBER}`, `${BASE_DOMAIN}`) per PR. Uses `keycloak.database=dev-mem` so no PVC is provisioned. |

Combine with `-f`:

```bash
helm upgrade --install kontor ./deploy/helm/kontor -n team-3m \
  -f deploy/helm/kontor/values-prod.yaml \
  -f deploy/helm/kontor/secrets.yaml \
  --set-string ai.existingSecret=kontor-ai-provider
```

`ingress.hosts` is a list, so each environment can advertise several domains
under one Ingress; the legacy single `ingress.host` still works as a fallback
when `hosts` is empty.

## Continuous deployment (GitHub Actions)

The manual `helm` flow above is mirrored in CI. A reusable workflow
(`.github/workflows/deploy.yml`) owns all helm/kubectl logic; it authenticates
through the Rancher proxy with a kubeconfig stored in the `KUBECONFIG_B64`
repository secret (see `deploy/rbac/`). The hosted AI key is applied as a
Kubernetes Secret before Helm runs, which keeps it out of Helm release history.

- **Prod** — on push to `main`, `ci-cd.yml` runs semantic-release, builds images
  tagged with the released version, then `deploy-prod` upgrades the `kontor`
  release in `team-3m` with `values-prod.yaml`.
- **Preview** — add the `deploy:preview` label to a PR. `pr.yml` builds PR images
  and stands up an ephemeral release in `team-3m-pr-<N>`, templating
  `values-pr.template.yaml` per PR. The namespace is created in the team's Rancher
  project (`RANCHER_PROJECT_ID`). Removing the label or closing the PR tears the
  namespace down. Hosted AI is disabled because pull-request-built code must not
  receive a reusable provider credential.

### Required GitHub configuration

| Kind                       | Name                                                                                             | Notes                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Variable                   | `RANCHER_PROJECT_ID`                                                                             | `c-f49m7:p-xj8vv` — places namespaces in the team project (quota + RBAC). |
| Variable (env `k8s-prod`)  | `AI_BASE_URL`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL` | Hosted provider endpoint and models; CI has course-gateway fallbacks. |
| Secret (repo)              | `KUBECONFIG_B64`                                                                                 | base64 of `deploy/rbac/extract-kubeconfig.sh` output.                     |
| Secret (env `k8s-prod`)    | `POSTGRES_PASSWORD`, `NEWS_POSTGRES_PASSWORD`, `AI_DB_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_DB_PASSWORD`, `AI_API_KEY`, `TWELVE_DATA_API_KEY` | `NEWS_POSTGRES_PASSWORD` / `AI_DB_PASSWORD` are the dedicated news/AI DB credentials (`AI_DB_PASSWORD` falls back to `POSTGRES_PASSWORD` when unset). `AI_API_KEY` authenticates the hosted OpenAI-compatible provider; `TWELVE_DATA_API_KEY` enables market data. |
| Secret (env `k8s-preview`) | `POSTGRES_PASSWORD`, `NEWS_POSTGRES_PASSWORD`, `AI_DB_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`, `TWELVE_DATA_API_KEY` | `dev-mem` Keycloak needs no DB password; hosted AI is disabled. |

The `k8s-prod` / `k8s-preview` GitHub Environments can be created with the
`Bootstrap Environments` workflow (`workflow_dispatch`, takes the environment
name as input). One-time RBAC bootstrap and the Rancher-project verification are
documented in [`deploy/rbac/README.md`](../../rbac/README.md).

`news.db.password` is required unless `news.db.existingSecret` is set — the
chart fails the render otherwise, like the other database passwords. The news
Postgres instance is independent from core's database and credentials; CI
supplies the password from the `NEWS_POSTGRES_PASSWORD` secret.

## Client runtime configuration

The client image is built once and configured at deploy time — the `VITE_*`
values are **not** baked at build. On container start, [`vite-envs`](https://github.com/garronej/vite-envs)
rewrites the served `index.html` from the pod environment, so the same image
works across environments.

`client.apiBaseUrl` is **required** — the chart `fail`s the render if it is
empty (no silent fallback to the build-time `http://localhost:8080`). Set it to
the **public origin** of the deployment **without** a `/api` suffix; the client
already prefixes its requests with `/api/v1/...`, which the ingress routes to
`core`.

OIDC config lives at the **top level** of the values (shared between client and
core). When `keycloak.deploy=true` and `oidc.issuerUrl` is empty, the issuer is
derived as `https://<first keycloak.hostname>/realms/<oidc.realm>`.

| Value               | Env var               | Purpose                                                                                                        |
| ------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `client.apiBaseUrl` | `VITE_API_BASE_URL`   | **Required.** Public base URL, e.g. `https://kontor.example.com` (no `/api`)                                   |
| `oidc.issuerUrl`    | `VITE_OIDC_AUTHORITY` | OIDC issuer URL. Auto-derived from `keycloak.hostnames[0]` + `oidc.realm` when empty and Keycloak is deployed. |
| `oidc.clientId`     | `VITE_OIDC_CLIENT_ID` | OIDC client ID for the SPA (default `kontor-spa`)                                                              |
| `oidc.audience`     | `VITE_OIDC_AUDIENCE`  | OIDC audience for issued tokens (default `kontor-api`)                                                         |

```bash
helm upgrade --install kontor ./deploy/helm/kontor -n team-3m \
  -f deploy/helm/kontor/secrets.yaml \
  --set client.apiBaseUrl=https://kontor.example.com \
  --set oidc.issuerUrl=https://kc.example.com/realms/kontor
```

`core` exposes typed config the same way (`core.springProfilesActive`,
`core.multipart.maxFileSize`, `core.multipart.maxRequestSize`,
`core.corsAllowedOrigins`), with `core.env` as an escape hatch for any other
non-secret env var.

## Keycloak (optional)

Set `keycloak.deploy=true` to stand up a Keycloak instance alongside the app.
`keycloak.database` picks the backing store:

- `postgres` _(default)_ — dedicated Postgres StatefulSet with its own PVC
  (`keycloak.db.*`). Separate failure/backup domain from the app DB. Use for
  prod.
- `dev-mem` — ephemeral H2 in-memory, no Postgres/PVC. The realm is re-imported
  fresh on every start. Use for throwaway PR previews.

Keycloak gets its own Ingress (independent of the app ingress toggle) so a
Keycloak-only release can serve auth without the app. The first entry in
`keycloak.hostnames` is the canonical `KC_HOSTNAME` / issuer base; every entry
also gets an ingress rule + TLS host.

The realm import is rendered into a ConfigMap and applied with `--import-realm`.
Wire the SPA's `redirectUris` and `webOrigins` from the values:

```yaml
keycloak:
  deploy: true
  database: postgres
  hostnames:
    - auth.kontor.example.com
  hostnameStrict: true
  realm:
    redirectUris:
      - https://kontor.example.com/*
    webOrigins:
      - https://kontor.example.com
    seedDevUser: false # never true in prod
```

`keycloak.admin.username` / `keycloak.admin.password` are the first-boot
bootstrap admin. Create a real admin and disable this account after the first
deploy; rotate via the Secret.

Health probes target the management port (`9000`) which Keycloak 26+ uses for
`/health`. The management port is intentionally cluster-internal — it is never
added to the ingress and not allowed from any pod in `NetworkPolicy`.

## Secrets — why and how

The cluster is shared across the entire `devops26` cohort. Other namespaces
cannot read Secrets in `team-3m`, but anyone with `get secret` in `team-3m`
can. Keep that in mind when granting RBAC.

Required secret values stored through Helm (the render `fail`s if these are
empty, unless `*.existingSecret` is set):

| Value                     | When required                                                 |
| ------------------------- | ------------------------------------------------------------- |
| `postgres.password`       | Always (the app DB).                                          |
| `news.db.password`        | Always (the dedicated news Postgres).                         |
| `ai.db.password`          | Always (recommendations and pgvector news store).             |
| `keycloak.admin.password` | When `keycloak.deploy=true`.                                  |
| `keycloak.db.password`    | When `keycloak.deploy=true` and `keycloak.database=postgres`. |

The hosted AI credential (`AI_API_KEY`, supplied via `ai.existingSecret`) and
`core.twelveDataApiKey` are not render-required, but without them the AI
recommendations (unless a local LLM fallback is reachable) and live market data
are disabled at runtime.

- Pass them via the gitignored `secrets.yaml` (templated from
  `secrets.example.yaml`) or `--set` on the CLI; never commit real secrets.
- `.gitignore` matches `deploy/helm/*/secrets.yaml` so the real file cannot
  be accidentally committed; `.helmignore` keeps it out of packaged charts.
- When `ai.hostedEnabled=true`, create a Secret containing `AI_API_KEY`
  out-of-band and set `ai.existingSecret` to its name. The chart intentionally
  has no `ai.apiKey` value, so provider credentials cannot enter Helm history.
  CI also changes the non-secret `ai.secretRevision` marker on every production
  deploy so rotated credentials roll the AI pods. For a manual rotation, run
  `kubectl rollout restart deployment/<release>-ai -n <namespace>`.
- `core` consumes credentials via `envFrom: secretRef`, and a `checksum/secret`
  pod annotation rolls the deployment when the secret changes.
- Use `*.existingSecret: <name>` to reference a Secret created out-of-band
  (e.g. by SealedSecrets/ESO once available).
- Hosted chat and news ingest use `ai.baseUrl`, `ai.chatModel`, and
  `ai.embeddingModel`. Deployment workflows read the corresponding generic
  GitHub environment variables.

## RabbitMQ

The chart pulls the [CloudPirates RabbitMQ chart](https://github.com/CloudPirates-io/helm-charts)
(official `rabbitmq` image, no CRDs) as a dependency — run
`helm dependency build deploy/helm/kontor` before lint/template/deploy (CI does
this automatically; `Chart.lock` is committed, `charts/` is gitignored). The
news aggregator publishes crawled articles to the durable queue `news.articles`
(exchange `kontor.news`); the AI service consumes from it. Contract:
`news/docs/asyncapi.yml`.

Credentials: the subchart generates the password and Erlang cookie into the
Secret `<release>-rabbitmq` (`helm.sh/resource-policy: keep` — values survive
upgrades and even uninstalls); the news and AI deployments read
`RABBITMQ_PASSWORD` from that Secret, so no CI-injected RabbitMQ secret is
needed. The management
UI (15672) is cluster-internal only: `kubectl port-forward svc/<release>-rabbitmq 15672`.
The queue is capped at 10,000 messages and 256 MiB with `reject-publish`; a
positive publisher confirm plus no mandatory return is required before an
article is marked pushed. Invalid or repeatedly failing consumer messages land
in the durable `news.articles.dead` queue, which has the same capacity limits
and drops its oldest entries when full. The AI consumer republishes terminal
failures to the dead-letter exchange before acknowledging the original instead
of adding immutable arguments to `news.articles`; a deployment after the
producer-only version therefore does not recreate or discard that queue.

## News service database

The news aggregator owns a **dedicated Postgres StatefulSet, Service, Secret,
and PVC** (see `news.db.*` values); it never connects to core's Postgres. Set
the required `news.db.password` via secrets.yaml / `--set`, or point
`news.db.existingSecret` at an externally managed Secret. Flyway
inside the news service owns schema migrations. When `news.db.existingSecret`
is managed outside Helm, bump `news.db.secretRevision` after rotating it to roll
the database and news pods.

The news Service is ClusterIP-only with no ingress route; the AI service consumes
through RabbitMQ. Use `kubectl port-forward` to call the manual aggregation API.
Manual aggregation requires a token carrying the `kontor-admin` realm role.
Fresh realms define that role (preview's seeded user receives it); for an
existing production realm, create the role if it predates this chart and assign
it to the intended operator account before using the endpoint.

## RabbitMQ

The chart pulls the [CloudPirates RabbitMQ chart](https://github.com/CloudPirates-io/helm-charts)
(official `rabbitmq` image, no CRDs) as a dependency — run
`helm dependency build deploy/helm/kontor` before lint/template/deploy (CI does
this automatically; `Chart.lock` is committed, `charts/` is gitignored). The
news aggregator publishes crawled articles to the durable queue `news.articles`
(exchange `kontor.news`); the AI service consumes from it and dead-letters
terminal failures to `news.articles.dead`. Contract: `news/docs/asyncapi.yml`.

Credentials: the subchart generates the password and Erlang cookie into the
Secret `<release>-rabbitmq` (`helm.sh/resource-policy: keep` — values survive
upgrades and even uninstalls); the news deployment reads `RABBITMQ_PASSWORD`
from that Secret, so no CI-injected RabbitMQ secret is needed. The management
UI (15672) is cluster-internal only: `kubectl port-forward svc/<release>-rabbitmq 15672`.
The queue is capped at 10,000 messages and 256 MiB with `reject-publish`; a
positive publisher confirm plus no mandatory return is required before an
article is marked pushed.

## News service database

The news aggregator owns a **dedicated Postgres StatefulSet, Service, Secret,
and PVC** (see `news.db.*` values); it never connects to core's Postgres. Set
the required `news.db.password` via secrets.yaml / `--set`, or point
`news.db.existingSecret` at an externally managed Secret. Flyway
inside the news service owns schema migrations. When `news.db.existingSecret`
is managed outside Helm, bump `news.db.secretRevision` after rotating it to roll
the database and news pods.

The news Service is ClusterIP; the ingress routes `/api/v1/news` plus the
API-docs paths (`/news/swagger-ui`, `/news/v3/api-docs`) to it, while all other
`/api` traffic goes to core.
Manual aggregation requires a token carrying the `kontor-admin` realm role.
Fresh realms define that role (preview's seeded user receives it); for an
existing production realm, create the role if it predates this chart and assign
it to the intended operator account before using the endpoint.

## NetworkPolicies

Enabled by default. Postgres only accepts ingress from the core and news pods
in this release; RabbitMQ accepts AMQP from news and AI; client/core only accept
ingress from `ingress-nginx`; news accepts ingress from `ingress-nginx` (API docs
only). When Keycloak is deployed it also gets locked-down
policies (its DB accepts only Keycloak traffic; Keycloak HTTP accepts only
ingress-nginx + core + ai + news).

Egress is open in the reusable defaults and restricted in production/preview.
Set `networkPolicy.restrictEgress: true` to
lock down which hosts `core` and `news` can dial out to. Per the template both
then get DNS, the app's Postgres, in-cluster Keycloak, and (when observability
is enabled) the OTLP gateway; `news` additionally keeps RabbitMQ (5672) and
HTTPS to public IPv4 addresses open because it publishes articles and fetches
external RSS feeds. Private, loopback, link-local, CGNAT, documentation,
multicast, and reserved ranges remain denied; application validation applies
the same restriction to every redirect.

## Upgrades and rotation

- App version bumps: bump `core.image.tag` / `client.image.tag` and re-run
  `helm upgrade`.
- Rotate the DB password: edit the Secret (`kubectl edit secret …-postgres`),
  update the value, then `kubectl rollout restart deployment/<release>-core`.
  The StatefulSet's PGDATA initializes once, so changing
  `POSTGRES_PASSWORD` in the Secret does **not** reset the live DB user —
  use `ALTER ROLE` for that.
- Storage resize: bump `postgres.persistence.size` (or
  `keycloak.db.persistence.size`) and re-apply. Ceph RBD + CSI supports online
  resize.

## Removing

```bash
helm uninstall kontor -n team-3m
# PVCs from a StatefulSet are NOT deleted automatically.
kubectl -n team-3m delete pvc -l app.kubernetes.io/instance=kontor
```

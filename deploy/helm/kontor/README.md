# kontor Helm chart

Deploys the Kontor stack into a single Kubernetes namespace:

- **client** — React SPA served by nginx, configured at runtime via `vite-envs`.
- **core** — Spring Boot API.
- **postgres** — single-instance StatefulSet with `pgvector`.
- **keycloak** *(optional)* — bundled identity provider, with its own dedicated
  Postgres or an in-memory H2 for throwaway PR previews.

Designed for the shared AET student cluster (RKE2 + nginx ingress + cert-manager
+ Ceph RBD storage), but everything is value-driven so it runs on any compliant
cluster.

## Prerequisites

- Namespace `team-3m` exists: `kubectl create namespace team-3m`
- Images pushed to `ghcr.io/aet-devops26/team-3m/kontor-core` and `…/kontor-client`
- cert-manager `ClusterIssuer` (default `letsencrypt-prod`) available

## Install

```bash
# 1. Copy the secrets template and fill in real passwords.
cp deploy/helm/kontor/secrets.example.yaml deploy/helm/kontor/secrets.yaml
$EDITOR deploy/helm/kontor/secrets.yaml   # gitignored

# 2. Render once to sanity-check.
helm template kontor ./deploy/helm/kontor \
  -n team-3m \
  -f deploy/helm/kontor/secrets.yaml | less

# 3. Install / upgrade.
helm upgrade --install kontor ./deploy/helm/kontor \
  -n team-3m \
  -f deploy/helm/kontor/secrets.yaml
```

## Environment overlays

Per-environment, non-secret values live in checked-in files alongside the chart;
secrets always stay in the gitignored `secrets.yaml`.

| File | Purpose |
|------|---------|
| `values.yaml` | Defaults — safe placeholders, every component enabled. |
| `values-prod.yaml` | Production overlay: `kontor.live` + the TUM cluster host, Postgres-backed Keycloak with strict hostname checks. |
| `values-pr.template.yaml` | Template for an ephemeral PR preview. CI renders it with `envsubst` (`${PR_NUMBER}`, `${BASE_DOMAIN}`) per PR. Uses `keycloak.database=dev-mem` so no PVC is provisioned. |

Combine with `-f`:

```bash
helm upgrade --install kontor ./deploy/helm/kontor -n team-3m \
  -f deploy/helm/kontor/values-prod.yaml \
  -f deploy/helm/kontor/secrets.yaml
```

`ingress.hosts` is a list, so each environment can advertise several domains
under one Ingress; the legacy single `ingress.host` still works as a fallback
when `hosts` is empty.

## Continuous deployment (GitHub Actions)

The manual `helm` flow above is mirrored in CI. A reusable workflow
(`.github/workflows/deploy.yml`) owns all helm/kubectl logic; it authenticates
through the Rancher proxy with a kubeconfig stored in the `KUBECONFIG_B64`
repository secret (see `deploy/rbac/`). Passwords are passed via
`--set-string` from environment secrets — never written to disk.

- **Prod** — on push to `main`, `ci-cd.yml` runs semantic-release, builds images
  tagged with the released version, then `deploy-prod` upgrades the `kontor`
  release in `team-3m` with `values-prod.yaml`.
- **Preview** — add the `deploy:preview` label to a PR. `pr.yml` builds PR images
  and stands up an ephemeral release in `team-3m-pr-<N>`, templating
  `values-pr.template.yaml` per PR. The namespace is created in the team's Rancher
  project (`RANCHER_PROJECT_ID`). Removing the label or closing the PR tears the
  namespace down.

### Required GitHub configuration

| Kind | Name | Notes |
|------|------|-------|
| Variable | `RANCHER_PROJECT_ID` | `c-f49m7:p-xj8vv` — places namespaces in the team project (quota + RBAC). |
| Secret (repo) | `KUBECONFIG_B64` | base64 of `deploy/rbac/extract-kubeconfig.sh` output. |
| Secret (env `k8s-prod`) | `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_DB_PASSWORD` | Must match the live cluster Secrets so existing DBs keep working. |
| Secret (env `k8s-preview`) | `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD` | Throwaway; `dev-mem` Keycloak needs no DB password. |

The `k8s-prod` / `k8s-preview` GitHub Environments can be created with the
`Bootstrap Environments` workflow (`workflow_dispatch`, takes the environment
name as input). One-time RBAC bootstrap and the Rancher-project verification are
documented in [`deploy/rbac/README.md`](../../rbac/README.md).

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

| Value | Env var | Purpose |
|-------|---------|---------|
| `client.apiBaseUrl` | `VITE_API_BASE_URL` | **Required.** Public base URL, e.g. `https://kontor.example.com` (no `/api`) |
| `oidc.issuerUrl` | `VITE_OIDC_AUTHORITY` | OIDC issuer URL. Auto-derived from `keycloak.hostnames[0]` + `oidc.realm` when empty and Keycloak is deployed. |
| `oidc.clientId` | `VITE_OIDC_CLIENT_ID` | OIDC client ID for the SPA (default `kontor-spa`) |
| `oidc.audience` | `VITE_OIDC_AUDIENCE` | OIDC audience for issued tokens (default `kontor-api`) |

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

- `postgres` *(default)* — dedicated Postgres StatefulSet with its own PVC
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
    seedDevUser: false  # never true in prod
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

Required secret values (the render `fail`s if these are empty, unless
`*.existingSecret` is set):

| Value | When required |
|-------|---------------|
| `postgres.password` | Always (the app DB). |
| `keycloak.admin.password` | When `keycloak.deploy=true`. |
| `keycloak.db.password` | When `keycloak.deploy=true` and `keycloak.database=postgres`. |

- Pass them via the gitignored `secrets.yaml` (templated from
  `secrets.example.yaml`) or `--set` on the CLI; never commit real secrets.
- `.gitignore` matches `deploy/helm/**/secrets.yaml` so the real file cannot
  be accidentally committed; `.helmignore` keeps it out of packaged charts.
- `core` consumes credentials via `envFrom: secretRef`, and a `checksum/secret`
  pod annotation rolls the deployment when the secret changes.
- Use `*.existingSecret: <name>` to reference a Secret created out-of-band
  (e.g. by SealedSecrets/ESO once available).

## NetworkPolicies

Enabled by default. Postgres only accepts ingress from the core pods in this
release; client/core only accept ingress from `ingress-nginx`. When Keycloak is
deployed it also gets locked-down policies (its DB accepts only Keycloak
traffic; Keycloak HTTP accepts only ingress-nginx + core).

Egress is open by default — set `networkPolicy.restrictEgress: true` to also
lock down which hosts `core` can dial out to (DNS + the app's Postgres +
in-cluster Keycloak, per the template).

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

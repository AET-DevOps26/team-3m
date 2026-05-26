# kontor Helm chart

Deploys the Kontor stack — React/nginx **client**, Spring Boot **core**, and a
single-instance **Postgres** (with `pgvector`) — into a single Kubernetes
namespace. Designed for the shared AET student cluster (RKE2 + nginx ingress +
cert-manager + Ceph RBD storage).

## Layout

```
deploy/helm/kontor/
├── Chart.yaml
├── values.yaml              # canonical defaults + every knob, documented
├── secrets.example.yaml     # committed template — copy to secrets.yaml and fill in
├── secrets.yaml             # gitignored; real password lives here
├── templates/
│   ├── _helpers.tpl
│   ├── NOTES.txt
│   ├── postgres-secret.yaml
│   ├── postgres-statefulset.yaml
│   ├── postgres-service.yaml
│   ├── core-deployment.yaml
│   ├── core-service.yaml
│   ├── client-deployment.yaml
│   ├── client-service.yaml
│   ├── ingress.yaml
│   └── networkpolicy.yaml
└── README.md
```

## Prerequisites

- Namespace `team-3m` exists: `kubectl create namespace team-3m`
- Images pushed to `ghcr.io/aet-devops26/team-3m/kontor-core` and `…/kontor-client`
- cert-manager `ClusterIssuer` `letsencrypt-prod` (already installed cluster-wide)
- Default `StorageClass` `csi-rbd-sc` (cluster default)

## Install

```bash
# 1. Copy the template and fill in the real password.
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

Override per-environment non-secret values (hosts, image tags, replica counts)
either inline with `--set ingress.hosts[0]=...` or by adding another `-f env.yaml`
file alongside `secrets.yaml`. `ingress.hosts` is a list, so prod can advertise
several domains under one Ingress; the legacy single `ingress.host` still works
as a fallback when `hosts` is empty.

## Client runtime configuration

The client image is built once and configured at deploy time — the `VITE_*`
values are **not** baked at build. On container start, [`vite-envs`](https://github.com/garronej/vite-envs)
rewrites the served `index.html` from the pod environment, so the same image
works across environments.

`client.apiBaseUrl` is **required** — the chart `fail`s the render if it is
empty (no silent fallback to the build-time `http://localhost:8080`). Set it to
the **public origin** of the deployment **without** a `/api` suffix; the client
already prefixes its requests with `/api/v1/...`, which the ingress routes to
`core`. The OIDC values are optional and fall back to the image's built-in
default when empty.

| Value | Env var | Purpose |
|-------|---------|---------|
| `client.apiBaseUrl` | `VITE_API_BASE_URL` | **Required.** Public base URL, e.g. `https://kontor.example.com` (no `/api`) |
| `client.oidc.authority` | `VITE_OIDC_AUTHORITY` | OIDC issuer/authority URL |
| `client.oidc.clientId` | `VITE_OIDC_CLIENT_ID` | OIDC client ID for the SPA |
| `client.oidc.redirectUri` | `VITE_OIDC_REDIRECT_URI` | OIDC redirect URI |
| `client.oidc.postLogoutRedirectUri` | `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | OIDC post-logout redirect URI |
| `client.oidc.audience` | `VITE_OIDC_AUDIENCE` | OIDC audience for issued tokens |

```bash
helm upgrade --install kontor ./deploy/helm/kontor -n team-3m \
  -f deploy/helm/kontor/secrets.yaml \
  --set client.apiBaseUrl=https://kontor.example.com \
  --set client.oidc.authority=https://kc.example.com/realms/kontor
```

`core` exposes typed config the same way (`core.springProfilesActive`,
`core.multipart.maxFileSize`, `core.multipart.maxRequestSize`,
`core.corsAllowedOrigins`), with `core.env` as an escape hatch for any other
non-secret env var.

## Secrets — why and how

The cluster is shared across the entire `devops26` cohort. Other namespaces
cannot read Secrets in `team-3m`, but anyone with `get secret` in `team-3m`
can. Keep that in mind when granting RBAC.

- `postgres.password` is **required**. The chart `fail`s the render if it is
  empty unless `postgres.existingSecret` is set.
- Secret values are passed via the gitignored `secrets.yaml` (templated from
  `secrets.example.yaml`) or `--set` on the CLI; never commit real secrets.
- `.gitignore` matches `deploy/helm/**/secrets.yaml` so the real file cannot
  be accidentally committed; `.helmignore` keeps it out of packaged charts.
- `core` consumes credentials via `envFrom: secretRef`, and a `checksum/secret`
  pod annotation rolls the deployment when the secret changes.
- Use `postgres.existingSecret: <name>` to reference a Secret created
  out-of-band (e.g. by SealedSecrets/ESO once available).

## NetworkPolicies

Enabled by default. Postgres only accepts ingress from the core pods in this
release; client/core only accept ingress from `ingress-nginx`. Egress is open
by default — set `networkPolicy.restrictEgress: true` to also lock down which
hosts `core` can dial out to (DNS + Postgres only, per the template).

## Upgrades and rotation

- App version bumps: bump `core.image.tag` / `client.image.tag` and re-run
  `helm upgrade`.
- Rotate the DB password: edit the Secret (`kubectl edit secret …-postgres`),
  update the value, then `kubectl rollout restart deployment/<release>-core`.
  The StatefulSet's PGDATA initializes once, so changing
  `POSTGRES_PASSWORD` in the Secret does **not** reset the live DB user —
  use `ALTER ROLE` for that.
- Storage resize: bump `postgres.persistence.size` and re-apply. Ceph RBD +
  CSI supports online resize.

## Removing

```bash
helm uninstall kontor -n team-3m
# PVCs from a StatefulSet are NOT deleted automatically.
kubectl -n team-3m delete pvc -l app.kubernetes.io/instance=kontor
```

## Future work

- Swap the StatefulSet for a CloudNativePG `Cluster` once the operator is
  installed cluster-wide (backups, PITR, failover come for free).
- Add a `ServiceMonitor` once Prometheus / Spring Boot Actuator are wired up.
- Externalize secrets via SealedSecrets or External Secrets Operator when the
  cluster offers them.

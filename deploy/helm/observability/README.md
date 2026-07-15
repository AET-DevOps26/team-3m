# kontor-observability

Shared, persistent LGTM observability stack for Kontor. One release serves **all**
environments (prod `team-3m` and every PR preview `team-3m-pr-<N>`); telemetry is
tagged with `deployment_environment` so a single Grafana variable filters and
switches between them, including multiple PR envs at once.

It lives in its own namespace (`team-3m-monitoring`) and its own
`workflow_dispatch` GitHub workflow (`.github/workflows/observability.yml`), so PR
deploy/teardown never touches it.

## Components

| Component | Role | Storage |
|-----------|------|---------|
| **SeaweedFS** | S3-compatible object store (buckets `loki`, `tempo`) | PVC (`csi-rbd-sc`) |
| **Loki** | Logs | S3 → SeaweedFS + WAL PVC |
| **Tempo** | Traces + span-metrics/service-graph generator | S3 → SeaweedFS + WAL PVC |
| **Prometheus** | Metrics (remote-write receiver) | PVC |
| **Grafana** | Dashboards, provisioned datasources + dashboards | PVC + ingress |
| **Alloy (gateway)** | OTLP receiver → Tempo/Loki/Prometheus; scrapes Keycloak `/metrics` | — |
| **Alloy (logs)** | Tails pod logs via the Kubernetes API → Loki | — |

## Signal flow

- **Traces** — apps push OTLP → Alloy gateway → Tempo.
- **Metrics** — core/ai push OTLP → Alloy → Prometheus remote-write; Keycloak's
  built-in Micrometer `/metrics` (mgmt port 9000) is scraped by Alloy.
- **Logs** — the Alloy log collector reads pod logs through the Kubernetes API (no
  hostPath / no `/var/log` mount), labels them `deployment_environment`, `service`,
  `namespace`, `pod`, `container`, and writes to Loki. Apps print `trace_id` in log
  lines so Grafana pivots logs ↔ traces.
- **Client RUM** — the browser SPA uses Grafana Faro and pushes Web Vitals,
  errors, sessions, and traces to the gateway's `faro.receiver` (`/collect` on the
  OTLP ingress host), which forwards logs/measurements to Loki and traces to Tempo.

```text
apps    ──OTLP──▶ alloy(gateway) ──▶ Tempo / Loki / Prometheus ──▶ Grafana
pods    ──k8s API──▶ alloy(logs) ───────────────────────────────▶ Loki ─┘
browser ──Faro──▶ alloy(gateway:/collect) ──▶ Tempo (traces) + Loki (logs)
```

## Retention (auto, strict for PRs)

- **Loki** — per-stream: `prod` 30d, `pr-*` 48h, default 14d
  (`files/loki/loki.yaml` → `limits_config.retention_stream`).
- **Tempo** — single tenant, global block retention 7d; `deployment.environment`
  is a queryable span attribute (kept unified for cross-env querying rather than
  per-tenant retention).
- **Prometheus** — global 15d + size cap (no per-label retention; PR series age out
  after teardown).

## Alerting (Grafana → Discord)

Grafana-managed alerting is provisioned from `files/grafana/alerting/` — a Discord
contact point, a root notification policy routing everything to it, and the alert
rules. It only activates when `alerting.existingSecret` names a Kubernetes Secret
with key `discord-webhook-url`; without it the chart renders exactly as before.
The webhook is never passed as a Helm value (it would be retained in release
history) — the workflow creates the `grafana-alerting-webhook` Secret with
`kubectl` before the Helm deploy and passes only the secret name plus
`alerting.secretChecksum`, a digest of the webhook that rolls the Grafana pod
when the webhook rotates. Grafana reads it via the `DISCORD_WEBHOOK_URL` env var
(env vars are expanded in provisioning files).

Setup: create a webhook in the Discord channel (Channel settings → Integrations →
Webhooks), store it as the `DISCORD_WEBHOOK_URL` repo secret, and re-run the
**Observability** workflow — it creates the Kubernetes Secret and wires the chart
automatically.

Provisioned rules (evaluated every 1m, prod only — PR previews stay silent):

| Alert | Condition | Severity |
|-------|-----------|----------|
| Core / AI / Keycloak down | No HTTP telemetry for 10m (probes generate steady traffic, so absence ≈ down) | critical |
| High server error rate | > 5% errored server spans per service for 10m | warning |
| High p95 latency | p95 server-span latency > 2s per service for 10m | warning |
| Error log spike | > 30 error/exception log lines per service within 5m | warning |
| JVM heap pressure | Heap > 90% of its limit for 10m | warning |
| JVM CPU saturation | JVM CPU > 90% for 15m | warning |
| Alloy OTLP gateway down | Prometheus can't scrape the gateway for 5m (ingestion outage — other alerts may be blind) | critical |

Provisioned resources are read-only in the Grafana UI; tune thresholds in
`files/grafana/alerting/rules.yaml` and redeploy. Notifications group by alert name
and repeat every 4h while firing; resolved notifications are sent automatically.

## Deploy

Via the workflow (recommended): run **Observability** in GitHub Actions
(`workflow_dispatch`). Or manually:

```sh
helm upgrade --install kontor-observability deploy/helm/observability \
  -n team-3m-monitoring --create-namespace \
  --set grafana.adminPassword=... --wait
```

Config lives under `files/` and is shared verbatim with the local
`docker-compose.observability.yml` stack (single source of truth).

## RBAC note (validate on first deploy)

The log collector reads `pods` + `pods/log` across namespaces via the Kubernetes
API. With `alloy.logs.clusterRBAC=true` (default) the chart ships a ClusterRole +
ClusterRoleBinding. If the shared cluster forbids cluster-scoped RBAC for the team,
set it to `false` and bind the `alloy` ServiceAccount per namespace instead (a Role
+ RoleBinding granting `pods`/`pods/log` read in `team-3m` and each PR namespace).
This API-based approach was chosen specifically to avoid hostPath `/var/log/pods`
mounts, which restricted PodSecurity admission commonly denies.

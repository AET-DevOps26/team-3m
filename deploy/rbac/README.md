# CI ServiceAccount & RBAC

These manifests provision a dedicated, least-privileged `kontor-ci` ServiceAccount
that the GitHub Actions deploy workflows authenticate as. It is decoupled from any
personal kubeconfig, audit-friendly, and revocable in one command.

## Files

| File | Purpose |
|------|---------|
| `serviceaccount.yaml` | `ServiceAccount kontor-ci` in `team-3m` + a long-lived token `Secret` (k8s ≥1.24 no longer auto-mints SA tokens). |
| `clusterrole-namespaces.yaml` | `ClusterRole kontor-ci-namespaces` — `create`/`get`/`list`/`delete` on cluster-scoped `namespaces`. |
| `clusterrolebinding.yaml` | Binds `kontor-ci-namespaces` to `team-3m:kontor-ci`. |
| `clusterrole-app.yaml` | `ClusterRole kontor-ci-app` — CRUD on the resource set the chart owns. A ClusterRole so one object can be RoleBound into N preview namespaces. |
| `rolebinding-prod.yaml` | RoleBinding in `team-3m` → `kontor-ci-app`. Preview namespaces get their own RoleBinding created idempotently by the deploy workflow. |
| `namespace.tpl` | Namespace template carrying the Rancher project annotation+label. CI fills `NAMESPACE`, `RANCHER_PROJECT_ID`, `RANCHER_PROJECT_LABEL` via `envsubst` so preview namespaces land in the team's Rancher project (quota + propagated RBAC). Not a `.yaml` file on purpose, so `kubectl apply -f deploy/rbac/` skips it. |
| `extract-kubeconfig.sh` | Emits an SA-token kubeconfig to stdout. |

## One-time bootstrap

```bash
kubectl apply -f deploy/rbac/

# Produce the kubeconfig and copy its base64 to the clipboard for the GH secret.
./deploy/rbac/extract-kubeconfig.sh | base64 | pbcopy   # → repo secret KUBECONFIG_B64
```

Smoke-test the SA (using the extracted kubeconfig as `KUBECONFIG`):

```bash
kubectl auth can-i create deployments -n team-3m   # → yes
kubectl auth can-i delete pods -n kube-system      # → no
kubectl auth can-i create namespaces               # → yes
```

### Verify Rancher project assignment

Preview namespaces must land in the team's Rancher project. Confirm the SA can
create a project-assigned namespace (the one capability Rancher's webhook may
gate on project membership):

```bash
NAMESPACE=team-3m-pr-0 \
RANCHER_PROJECT_ID=c-f49m7:p-xj8vv \
RANCHER_PROJECT_LABEL=p-xj8vv \
  envsubst < deploy/rbac/namespace.tpl | kubectl apply -f -

kubectl get ns team-3m-pr-0 \
  -o jsonpath='{.metadata.annotations.field\.cattle\.io/projectId}{"\n"}'
# expect: c-f49m7:p-xj8vv

kubectl delete ns team-3m-pr-0
```

If the projectId does not stick, grant `kontor-ci` project membership once in the
Rancher UI (Project → Members) or via a `ProjectRoleTemplateBinding`
(`project-member`), then re-test.

## Rotation / revocation

- Rotate the token: `kubectl delete secret kontor-ci-token -n team-3m && kubectl apply -f serviceaccount.yaml`, re-run `extract-kubeconfig.sh`, update `KUBECONFIG_B64`.
- Revoke all CI access: `kubectl delete -f deploy/rbac/`.

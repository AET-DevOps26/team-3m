# CI cluster access & RBAC

The GitHub Actions deploy workflows reach the cluster through the **Rancher
authenticating proxy** (`https://rancher.ase.cit.tum.de/k8s/clusters/c-f49m7`),
because the kube-apiserver itself is not reachable from GitHub-hosted runners
(VPN/campus-only). The proxy authenticates **Rancher API tokens** — not
Kubernetes ServiceAccount tokens — so CI authenticates as a Rancher principal,
and authorization comes from that principal's **Rancher project membership**
(`project-owner` on `c-f49m7:p-xj8vv`, the `devops26-team-3m` project), not from
the Kubernetes RBAC manifests in this directory.

## Files

| File | Purpose |
|------|---------|
| `extract-kubeconfig.sh` | Formats a kubeconfig for the Rancher proxy from `RANCHER_TOKEN`. No CA pin — the proxy serves a publicly-trusted cert, so the runner's system trust store validates it. |
| `namespace.tpl` | Namespace template carrying the Rancher project annotation+label. CI fills `NAMESPACE`, `RANCHER_PROJECT_ID`, `RANCHER_PROJECT_LABEL` via `envsubst` so preview namespaces land in the team's Rancher project (quota + propagated RBAC). Not a `.yaml` file on purpose, so `kubectl apply -f deploy/rbac/` skips it. |
| `serviceaccount.yaml`, `clusterrole-namespaces.yaml`, `clusterrolebinding.yaml`, `clusterrole-app.yaml`, `rolebinding-prod.yaml` | **Not used by the proxy-based CI.** Retained for the alternative direct-apiserver path (an in-cluster/self-hosted runner), where a `kontor-ci` ServiceAccount token authenticates against the apiserver at `:6443`. |

## One-time bootstrap

1. In Rancher, create an API key scoped to this cluster: avatar → **Account & API
   Keys** → **Create API Key**, Scope = the cluster (`c-f49m7`). Copy the
   `token-xxxxx:...` bearer token. Tokens here expire (cluster max is 90 days),
   so this must be rotated — see below.
2. Format the kubeconfig and copy its base64 to the clipboard for the GH secret:

```bash
RANCHER_TOKEN='token-xxxxx:...' ./deploy/rbac/extract-kubeconfig.sh | base64 | pbcopy
# → repo secret KUBECONFIG_B64
```

Smoke-test the token (using the extracted kubeconfig as `KUBECONFIG`):

```bash
kubectl auth whoami                                # → your Rancher user
kubectl auth can-i create deployments -n team-3m   # → yes
kubectl auth can-i create namespaces               # → yes
```

### Verify Rancher project assignment

Preview namespaces must land in the team's Rancher project so its `project-owner`
RBAC propagates into them (this is what authorizes CI to deploy there — no manual
RoleBinding needed). Confirm namespace creation assigns the project:

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

## Rotation / revocation

- **Rotate** (required before the token's ≤90-day expiry): create a new scoped API
  key, re-run `extract-kubeconfig.sh`, update `KUBECONFIG_B64`, then delete the old
  token in Rancher (**Account & API Keys**, or
  `DELETE https://rancher.ase.cit.tum.de/v3/token/<id>`).
- **Revoke** CI access immediately: delete the token in Rancher. The kubeconfig in
  `KUBECONFIG_B64` is inert without a live token.

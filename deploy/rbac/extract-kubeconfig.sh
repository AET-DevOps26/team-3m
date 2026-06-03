#!/usr/bin/env bash
set -euo pipefail

RANCHER_URL="${RANCHER_URL:-https://rancher.ase.cit.tum.de}"
CLUSTER_ID="${CLUSTER_ID:-c-f49m7}"
CONTEXT_NAME="${CONTEXT_NAME:-kontor-ci}"
: "${RANCHER_TOKEN:?set RANCHER_TOKEN to a Rancher API token scoped to ${CLUSTER_ID}}"

cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: cluster
    cluster:
      server: ${RANCHER_URL%/}/k8s/clusters/${CLUSTER_ID}
contexts:
  - name: ${CONTEXT_NAME}
    context:
      cluster: cluster
      user: ${CONTEXT_NAME}
current-context: ${CONTEXT_NAME}
users:
  - name: ${CONTEXT_NAME}
    user:
      token: ${RANCHER_TOKEN}
EOF

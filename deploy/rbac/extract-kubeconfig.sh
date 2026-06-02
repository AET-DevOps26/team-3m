#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-team-3m}"
SA="${SA:-kontor-ci}"
SECRET="${SECRET:-kontor-ci-token}"
CONTEXT_NAME="${CONTEXT_NAME:-kontor-ci}"

server="$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')"
ca="$(kubectl get secret "$SECRET" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}')"
token="$(kubectl get secret "$SECRET" -n "$NAMESPACE" -o jsonpath='{.data.token}' | base64 -d)"

if [ -z "$token" ]; then
  echo "error: token not populated in $NAMESPACE/$SECRET yet — wait a moment and retry" >&2
  exit 1
fi

cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: cluster
    cluster:
      server: ${server}
      certificate-authority-data: ${ca}
contexts:
  - name: ${CONTEXT_NAME}
    context:
      cluster: cluster
      namespace: ${NAMESPACE}
      user: ${SA}
current-context: ${CONTEXT_NAME}
users:
  - name: ${SA}
    user:
      token: ${token}
EOF

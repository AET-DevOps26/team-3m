apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  annotations:
    field.cattle.io/projectId: ${RANCHER_PROJECT_ID}
  labels:
    field.cattle.io/projectId: ${RANCHER_PROJECT_LABEL}

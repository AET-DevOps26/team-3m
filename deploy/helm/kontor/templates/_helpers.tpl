{{/*
Expand the name of the chart.
*/}}
{{- define "kontor.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kontor.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Chart label.
*/}}
{{- define "kontor.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels.
*/}}
{{- define "kontor.labels" -}}
helm.sh/chart: {{ include "kontor.chart" . }}
{{ include "kontor.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: kontor
{{- end -}}

{{/*
Selector labels (shared across components — components add their own
`app.kubernetes.io/component` on top).
*/}}
{{- define "kontor.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kontor.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Component-scoped resource names.
*/}}
{{- define "kontor.core.fullname" -}}
{{- printf "%s-core" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kontor.client.fullname" -}}
{{- printf "%s-client" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kontor.postgres.fullname" -}}
{{- printf "%s-postgres" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the Secret holding Postgres credentials.
*/}}
{{- define "kontor.postgres.secretName" -}}
{{- if .Values.postgres.existingSecret -}}
{{- .Values.postgres.existingSecret -}}
{{- else -}}
{{- printf "%s-postgres" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Resolve an image reference for a component.
Usage: include "kontor.image" (dict "root" . "component" .Values.core)
*/}}
{{- define "kontor.image" -}}
{{- $registry := .root.Values.image.registry -}}
{{- if hasKey .component.image "registry" -}}
{{- $registry = .component.image.registry -}}
{{- end -}}
{{- $repo := .component.image.repository -}}
{{- $tag := default .root.Chart.AppVersion .component.image.tag -}}
{{- if $registry -}}
{{ printf "%s/%s:%s" $registry $repo $tag }}
{{- else -}}
{{ printf "%s:%s" $repo $tag }}
{{- end -}}
{{- end -}}

{{- define "kontor.imagePullPolicy" -}}
{{- default .root.Values.image.pullPolicy .component.image.pullPolicy -}}
{{- end -}}

{{/*
Keycloak component-scoped resource names.
*/}}
{{- define "kontor.keycloak.fullname" -}}
{{- printf "%s-keycloak" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kontor.keycloak.postgres.fullname" -}}
{{- printf "%s-keycloak-db" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the Secret holding the Keycloak bootstrap admin credentials.
*/}}
{{- define "kontor.keycloak.secretName" -}}
{{- if .Values.keycloak.admin.existingSecret -}}
{{- .Values.keycloak.admin.existingSecret -}}
{{- else -}}
{{- include "kontor.keycloak.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Name of the Secret holding the Keycloak Postgres credentials.
*/}}
{{- define "kontor.keycloak.postgres.secretName" -}}
{{- if .Values.keycloak.db.existingSecret -}}
{{- .Values.keycloak.db.existingSecret -}}
{{- else -}}
{{- include "kontor.keycloak.postgres.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Keycloak image reference. Keycloak is on quay.io (full repository path), so the
global ghcr registry from `kontor.image` must NOT be prepended.
*/}}
{{- define "kontor.keycloak.image" -}}
{{- $tag := default "latest" .Values.keycloak.image.tag -}}
{{ printf "%s:%s" .Values.keycloak.image.repository $tag }}
{{- end -}}

{{/*
Resolve the OIDC issuer URL. Prefer an explicit `oidc.issuerUrl`; otherwise, when
this release deploys Keycloak, derive it from the first hostname + realm.
*/}}
{{- define "kontor.oidc.issuerUrl" -}}
{{- if .Values.oidc.issuerUrl -}}
{{- .Values.oidc.issuerUrl -}}
{{- else if and .Values.keycloak.deploy (gt (len .Values.keycloak.hostnames) 0) -}}
{{- printf "https://%s/realms/%s" (first .Values.keycloak.hostnames) .Values.oidc.realm -}}
{{- end -}}
{{- end -}}

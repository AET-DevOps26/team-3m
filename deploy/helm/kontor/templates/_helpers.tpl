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
Component-scoped resource names.
*/}}
{{- define "kontor.ai.fullname" -}}
{{- printf "%s-ai" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the Secret holding core market-data credentials (TWELVE_DATA_API_KEY).
*/}}
{{- define "kontor.core.marketDataSecretName" -}}
{{- if .Values.core.existingMarketDataSecret -}}
{{- .Values.core.existingMarketDataSecret -}}
{{- else -}}
{{- printf "%s-core-market-data" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Name of the Secret holding AI service credentials (AI_API_KEY).
*/}}
{{- define "kontor.ai.secretName" -}}
{{- if .Values.ai.existingSecret -}}
{{- .Values.ai.existingSecret -}}
{{- else -}}
{{- printf "%s-ai" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "kontor.news.fullname" -}}
{{- printf "%s-news" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kontor.news.postgres.fullname" -}}
{{- printf "%s-news-db" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the Secret holding the news service's Postgres credentials.
*/}}
{{- define "kontor.news.postgres.secretName" -}}
{{- if .Values.news.db.existingSecret -}}
{{- .Values.news.db.existingSecret -}}
{{- else -}}
{{- include "kontor.news.postgres.fullname" . -}}
{{- end -}}
{{- end -}}

{{/*
Name of the RabbitMQ subchart's Service and Secret (standard subchart fullname:
release name + chart name; our release names never contain "rabbitmq").
*/}}
{{- define "kontor.rabbitmq.fullname" -}}
{{- printf "%s-rabbitmq" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kontor.ai.postgres.fullname" -}}
{{- printf "%s-ai-db" (include "kontor.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the Secret holding the AI Postgres credentials.
*/}}
{{- define "kontor.ai.postgres.secretName" -}}
{{- if .Values.ai.db.existingSecret -}}
{{- .Values.ai.db.existingSecret -}}
{{- else -}}
{{- include "kontor.ai.postgres.fullname" . -}}
{{- end -}}
{{- end -}}

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
OpenTelemetry env for OTLP-instrumented backend services (core, ai).
Usage: include "kontor.observability.backendEnv" (dict "root" . "serviceName" "kontor-core")
*/}}
{{- define "kontor.observability.backendEnv" -}}
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: {{ .root.Values.observability.collectorEndpoint | quote }}
- name: OTEL_EXPORTER_OTLP_PROTOCOL
  value: grpc
- name: OTEL_SERVICE_NAME
  value: {{ .serviceName | quote }}
- name: OTEL_RESOURCE_ATTRIBUTES
  value: {{ printf "service.namespace=kontor,deployment.environment=%s" (default "unknown" .root.Values.observability.environment) | quote }}
- name: OTEL_TRACES_SAMPLER
  value: parentbased_traceidratio
- name: OTEL_TRACES_SAMPLER_ARG
  value: {{ .root.Values.observability.traces.sampleRatio | quote }}
- name: OTEL_TRACES_EXPORTER
  value: otlp
- name: OTEL_METRICS_EXPORTER
  value: otlp
- name: OTEL_LOGS_EXPORTER
  value: none
{{- end -}}

{{/*
Single-instance Postgres StatefulSet, shared by the core, AI, and Keycloak
databases (all use the plain envFrom-secret startup). The news database has a
password-rotation lifecycle of its own and keeps its own template.

Usage: include "kontor.postgres.statefulset" (dict
  "root" .                     -- chart root context
  "fullname" "..."             -- resource + serviceName
  "component" "postgres"       -- app.kubernetes.io/component
  "secretName" "..."           -- Secret with POSTGRES_* env
  "db" .Values.postgres        -- image / security / resources / persistence
  "scheduling" .Values.postgres -- nodeSelector / tolerations / affinity
)
The caller owns the enable guard so each database's condition stays visible.
*/}}
{{- define "kontor.postgres.statefulset" -}}
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{ .fullname }}
  labels:
    {{- include "kontor.labels" .root | nindent 4 }}
    app.kubernetes.io/component: {{ .component }}
spec:
  serviceName: {{ .fullname }}
  replicas: 1
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: {{ .root.Values.pvcRetentionWhenDeleted }}
    whenScaled: Retain
  selector:
    matchLabels:
      {{- include "kontor.selectorLabels" .root | nindent 6 }}
      app.kubernetes.io/component: {{ .component }}
  template:
    metadata:
      labels:
        {{- include "kontor.labels" .root | nindent 8 }}
        app.kubernetes.io/component: {{ .component }}
    spec:
      securityContext:
        {{- toYaml .db.podSecurityContext | nindent 8 }}
      containers:
        - name: postgres
          image: {{ include "kontor.image" (dict "root" .root "component" .db) | quote }}
          imagePullPolicy: {{ include "kontor.imagePullPolicy" (dict "root" .root "component" .db) }}
          securityContext:
            {{- toYaml .db.containerSecurityContext | nindent 12 }}
          ports:
            - name: postgres
              containerPort: 5432
              protocol: TCP
          envFrom:
            - secretRef:
                name: {{ .secretName }}
          env:
            # Use a subdir of the mounted PVC so initdb doesn't trip on lost+found.
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - exec pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 6
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - exec pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1
            initialDelaySeconds: 30
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 6
          resources:
            {{- toYaml .db.resources | nindent 12 }}
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: run
              mountPath: /var/run/postgresql
            - name: tmp
              mountPath: /tmp
        {{- if and .db.metrics .db.metrics.enabled }}
        - name: postgres-exporter
          image: {{ include "kontor.image" (dict "root" .root "component" .db.metrics) | quote }}
          imagePullPolicy: {{ include "kontor.imagePullPolicy" (dict "root" .root "component" .db.metrics) }}
          securityContext:
            {{- toYaml .db.containerSecurityContext | nindent 12 }}
          ports:
            - name: metrics
              containerPort: 9187
              protocol: TCP
          env:
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: {{ .secretName }}
                  key: POSTGRES_DB
            - name: DATA_SOURCE_USER
              valueFrom:
                secretKeyRef:
                  name: {{ .secretName }}
                  key: POSTGRES_USER
            - name: DATA_SOURCE_PASS
              valueFrom:
                secretKeyRef:
                  name: {{ .secretName }}
                  key: POSTGRES_PASSWORD
            - name: DATA_SOURCE_URI
              value: "127.0.0.1:5432/$(POSTGRES_DB)?sslmode=disable"
          readinessProbe:
            httpGet:
              path: /
              port: metrics
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            {{- toYaml .db.metrics.resources | nindent 12 }}
        {{- end }}
      {{- with .scheduling.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .scheduling.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .scheduling.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      volumes:
        - name: run
          emptyDir: {}
        - name: tmp
          emptyDir: {}
        {{- if not .db.persistence.enabled }}
        - name: data
          emptyDir: {}
        {{- end }}
  {{- if .db.persistence.enabled }}
  volumeClaimTemplates:
    - metadata:
        name: data
        labels:
          {{- include "kontor.selectorLabels" .root | nindent 10 }}
          app.kubernetes.io/component: {{ .component }}
      spec:
        accessModes:
          {{- toYaml .db.persistence.accessModes | nindent 10 }}
        {{- with .db.persistence.storageClass }}
        storageClassName: {{ . | quote }}
        {{- end }}
        resources:
          requests:
            storage: {{ .db.persistence.size | quote }}
  {{- end }}
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

{{/*
Resolve the JWKS URI for core's token signature verification. When
`oidc.internalJwks` is set (preview envs with an untrusted ingress cert),
fetch keys from the in-cluster Keycloak Service over HTTP. Otherwise derive
from the public issuer URL.
*/}}
{{- define "kontor.oidc.jwkSetUri" -}}
{{- if and .Values.oidc.internalJwks .Values.keycloak.deploy -}}
{{- printf "http://%s:%v/realms/%s/protocol/openid-connect/certs" (include "kontor.keycloak.fullname" .) .Values.keycloak.service.httpPort .Values.oidc.realm -}}
{{- else -}}
{{- with (include "kontor.oidc.issuerUrl" .) -}}
{{- printf "%s/protocol/openid-connect/certs" . -}}
{{- end -}}
{{- end -}}
{{- end -}}

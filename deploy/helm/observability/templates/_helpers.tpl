{{- define "obs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "obs.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "obs.labels" -}}
helm.sh/chart: {{ include "obs.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: kontor-observability
{{- end -}}

{{/*
Per-component labels.
Usage: include "obs.componentLabels" (dict "root" . "component" "loki")
*/}}
{{- define "obs.componentLabels" -}}
{{ include "obs.labels" .root }}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/component: {{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end -}}

{{- define "obs.selectorLabels" -}}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end -}}

{{- define "obs.s3.secretName" -}}
{{- if .Values.s3.existingSecret -}}
{{- .Values.s3.existingSecret -}}
{{- else -}}
seaweedfs-s3
{{- end -}}
{{- end -}}

{{- define "obs.grafana.secretName" -}}
{{- if .Values.grafana.existingSecret -}}
{{- .Values.grafana.existingSecret -}}
{{- else -}}
grafana-admin
{{- end -}}
{{- end -}}

{{- define "obs.alerting.enabled" -}}
{{- $alerting := .Values.alerting | default dict -}}
{{- if or $alerting.discordWebhookUrl $alerting.existingSecret -}}true{{- end -}}
{{- end -}}

{{- define "obs.alerting.secretName" -}}
{{- $alerting := .Values.alerting | default dict -}}
{{- if $alerting.existingSecret -}}
{{- $alerting.existingSecret -}}
{{- else -}}
grafana-alerting
{{- end -}}
{{- end -}}

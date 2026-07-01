import { getWebInstrumentations, initializeFaro } from "@grafana/faro-react"
import { TracingInstrumentation } from "@grafana/faro-web-tracing"

export function initObservability(): void {
  const url = import.meta.env.VITE_FARO_COLLECTOR_URL
  if (!url) {
    return
  }

  initializeFaro({
    url,
    app: {
      name: import.meta.env.VITE_OTEL_SERVICE_NAME ?? "kontor-client",
      namespace: "kontor",
      environment: import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT ?? "unknown",
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
    ],
  })
}

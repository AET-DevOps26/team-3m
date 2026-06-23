import { logs, SeverityNumber } from "@opentelemetry/api-logs"
import { ZoneContextManager } from "@opentelemetry/context-zone"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load"
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs"
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from "@opentelemetry/sdk-trace-web"
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions"

const DEPLOYMENT_ENVIRONMENT = "deployment.environment"
const SERVICE_NAMESPACE = "service.namespace"

/**
 * Initializes browser OpenTelemetry (traces + logs) for the SPA, pushing OTLP/HTTP
 * to the shared Alloy gateway. No-op when VITE_OTEL_EXPORTER_OTLP_ENDPOINT is unset,
 * so the app runs unchanged when observability is disabled. Per the signal matrix the
 * client emits traces and logs only — no metrics.
 */
export function initObservability(): void {
  const endpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) {
    return
  }

  const base = endpoint.replace(/\/$/, "")
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]:
      import.meta.env.VITE_OTEL_SERVICE_NAME || "kontor-client",
    [SERVICE_NAMESPACE]: "kontor",
    [DEPLOYMENT_ENVIRONMENT]:
      import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT || "unknown",
  })

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${base}/v1/traces` }),
      ),
    ],
  })
  tracerProvider.register({ contextManager: new ZoneContextManager() })

  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      new DocumentLoadInstrumentation(),
      // Only propagate the W3C trace header to same-origin requests (the /api calls).
      // Injecting `traceparent` on cross-origin fetches (e.g. Keycloak) triggers a CORS
      // preflight those servers reject, which breaks login.
      new FetchInstrumentation(),
    ],
  })

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${base}/v1/logs` }),
      ),
    ],
  })
  logs.setGlobalLoggerProvider(loggerProvider)
  registerBrowserErrorLogging()
}

function registerBrowserErrorLogging(): void {
  const logger = logs.getLogger("kontor-client")

  window.addEventListener("error", (event) => {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: event.message,
      attributes: {
        "exception.type": event.error?.name,
        "exception.stacktrace": event.error?.stack,
      },
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: `Unhandled promise rejection: ${String(event.reason)}`,
    })
  })
}

import { useMutation } from "@tanstack/react-query"
import { type APIError, RecoverableError } from "../errors"
import { httpRequest } from "../http"

export type HealthEndpoint = "server" | "database"

export interface HealthCheckResult {
  message: string
  latencyMs: number
}

export interface UseHealthCheckOptions {
  silent?: boolean
}

interface ActuatorHealth {
  status: string
}

interface ActuatorInfo {
  app?: { version?: string }
  build?: { version?: string }
}

const HEALTH_PATHS: Record<HealthEndpoint, string> = {
  server: "/api/health",
  database: "/api/health/database",
}

const ERROR_TITLES: Record<HealthEndpoint, string> = {
  server: "Server connection failed",
  database: "Database connection failed",
}

export function useHealthCheck(
  endpoint: HealthEndpoint,
  options: UseHealthCheckOptions = {},
) {
  return useMutation<HealthCheckResult, APIError>({
    mutationFn: async () => {
      const start = performance.now()
      const health = await httpRequest<ActuatorHealth>({
        method: "GET",
        path: HEALTH_PATHS[endpoint],
      })
      const latencyMs = Math.round(performance.now() - start)

      if (endpoint === "server") {
        const info = await httpRequest<ActuatorInfo>({
          method: "GET",
          path: "/api/info",
        })
        const version = info.app?.version ?? info.build?.version ?? "unknown"
        return { message: `${health.status} · version ${version}`, latencyMs }
      }

      return { message: health.status, latencyMs }
    },
    meta: {
      silent: options.silent ?? true,
      errorFormatter: (error: APIError) =>
        new RecoverableError({
          message: error.message,
          title: ERROR_TITLES[endpoint],
          presentation: { hideCancel: true, debugInfo: error.code },
        }),
    },
  })
}

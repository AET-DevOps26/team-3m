import { useMutation } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import { APIError, RecoverableError } from "../errors"

export type HealthEndpoint = "server" | "database" | "ai"

export interface HealthCheckResult {
  message: string
  latencyMs: number
}

export interface UseHealthCheckOptions {
  silent?: boolean
}

const HEALTH_PATHS = {
  server: "/api/v1/health/server",
  database: "/api/v1/health/database",
  ai: "/ai/health/readiness",
} as const satisfies Record<HealthEndpoint, string>

const ERROR_TITLES: Record<HealthEndpoint, string> = {
  server: "Server connection failed",
  database: "Database connection failed",
  ai: "AI service connection failed",
}

export function useHealthCheck(
  endpoint: HealthEndpoint,
  options: UseHealthCheckOptions = {},
) {
  return useMutation<HealthCheckResult, APIError>({
    mutationFn: async () => {
      const start = performance.now()
      const { data } = await apiClient.GET(HEALTH_PATHS[endpoint], {
        parseAs: "text",
      })
      if (data === undefined) {
        throw new APIError({
          code: "parse",
          message: "Server returned an empty health response",
        })
      }
      return {
        message: data,
        latencyMs: Math.round(performance.now() - start),
      }
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

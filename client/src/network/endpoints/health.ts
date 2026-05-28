import { useMutation } from "@tanstack/react-query"
import { type APIError, RecoverableError } from "../errors"
import { httpRequest } from "../http"

export type HealthEndpoint = "hello" | "database"

export interface HealthCheckResult {
  message: string
  latencyMs: number
}

export interface UseHealthCheckOptions {
  silent?: boolean
}

const ERROR_TITLES: Record<HealthEndpoint, string> = {
  hello: "Server connection failed",
  database: "Database connection failed",
}

export function useHealthCheck(
  endpoint: HealthEndpoint,
  options: UseHealthCheckOptions = {},
) {
  return useMutation<HealthCheckResult, APIError>({
    mutationFn: async () => {
      const start = performance.now()
      const message = await httpRequest<string>({
        method: "GET",
        path: `/${endpoint}`,
        parse: "text",
      })
      return {
        message,
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

import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { APIError, type ErrorFormatter, RecoverableError } from "./errors"
import { publishRecoverableError } from "./recovery/error-recovery-broker"

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: APIQueryMeta
    mutationMeta: APIMutationMeta
  }
}

export interface APIMeta {
  silent?: boolean
  errorFormatter?: ErrorFormatter
}

export type APIQueryMeta = APIMeta
export type APIMutationMeta = APIMeta

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        publish(error, query.meta)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        publish(error, mutation.meta)
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof APIError && error.code === "validation") {
            return false
          }
          return failureCount < 1
        },
        staleTime: 30_000,
      },
    },
  })
}

function publish(error: unknown, meta: APIMeta | undefined) {
  if (meta?.silent) {
    return
  }
  const recoverable =
    meta?.errorFormatter && error instanceof APIError
      ? meta.errorFormatter(error)
      : RecoverableError.wrapping(error)
  publishRecoverableError(recoverable)
}

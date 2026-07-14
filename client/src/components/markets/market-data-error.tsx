import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIError } from "@/network/errors"

/**
 * Error-boundary fallback for market-data failures (unknown symbol, provider
 * unavailable). Shared by the market detail page and the holdings chart dialog.
 */
export function marketDataErrorFallback(error: Error) {
  const isRateLimited = error instanceof APIError && error.status === 429
  const message =
    error instanceof APIError
      ? error.message
      : "Something went wrong. Please try again later."

  return (
    <Alert variant={isRateLimited ? "default" : "destructive"}>
      <AlertTitle>
        {isRateLimited
          ? "Live market data paused"
          : "Could not load market data"}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

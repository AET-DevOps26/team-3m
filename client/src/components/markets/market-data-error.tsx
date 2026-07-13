import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIError } from "@/network/errors"

/**
 * Error-boundary fallback for market-data failures (unknown symbol, provider
 * unavailable). Shared by the market detail page and the holdings chart dialog.
 */
export function marketDataErrorFallback(error: Error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load market data</AlertTitle>
      <AlertDescription>
        {error instanceof APIError
          ? error.message
          : "Something went wrong. Please try again later."}
      </AlertDescription>
    </Alert>
  )
}

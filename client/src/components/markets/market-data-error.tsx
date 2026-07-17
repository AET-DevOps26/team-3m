import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIError } from "@/network/errors"

/**
 * Error-boundary fallback for market-data failures, shared by the market detail
 * page and the holdings chart dialog. Rate-limit (429) and unknown-instrument
 * (404) render as calm informational notices; other failures use the
 * destructive style.
 */
export function marketDataErrorFallback(error: Error) {
  const status = error instanceof APIError ? error.status : undefined
  const isRateLimited = status === 429
  const isUnknownInstrument = status === 404
  const isExpectedState = isRateLimited || isUnknownInstrument

  const title = isRateLimited
    ? "Live market data paused"
    : isUnknownInstrument
      ? "No market data available"
      : "Could not load market data"

  const message = isUnknownInstrument
    ? "We don’t have price data for this instrument."
    : error instanceof APIError
      ? error.message
      : "Something went wrong. Please try again later."

  return (
    <Alert variant={isExpectedState ? "default" : "destructive"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIError } from "@/network/errors"

/**
 * Error-boundary fallback for market-data failures. Shared by the market detail
 * page and the holdings chart dialog.
 *
 * Expected provider states — a paused feed (rate limit) or an instrument the
 * provider does not cover (unknown symbol) — are shown as calm, informational
 * notices rather than an alarming failure, so they do not read as a Kontor bug.
 * Genuine failures (provider down, network, parse) keep the destructive style.
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

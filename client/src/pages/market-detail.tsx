import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { InstrumentPriceCard } from "@/components/markets/instrument-price-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { APIError } from "@/network/errors"

function marketDataErrorFallback(error: Error) {
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

export function MarketDetailPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const decodedSymbol = symbol ? decodeURIComponent(symbol) : ""

  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/markets"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Markets
          </Link>
          <h1 className="text-xl font-semibold tabular-nums">
            {decodedSymbol}
          </h1>
        </div>

        <ErrorBoundary renderFallback={marketDataErrorFallback}>
          <InstrumentPriceCard symbol={decodedSymbol} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

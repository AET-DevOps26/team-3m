import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { InstrumentPriceCard } from "@/components/markets/instrument-price-card"
import { marketDataErrorFallback } from "@/components/markets/market-data-error"

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function MarketDetailPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const decodedSymbol = symbol ? safeDecodeURIComponent(symbol) : ""

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

        <ErrorBoundary
          key={decodedSymbol}
          renderFallback={marketDataErrorFallback}
        >
          <InstrumentPriceCard symbol={decodedSymbol} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

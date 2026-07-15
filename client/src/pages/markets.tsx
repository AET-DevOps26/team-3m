import { ErrorBoundary } from "@/components/error-boundary"
import { InstrumentSearch } from "@/components/markets/instrument-search"

export function MarketsPage() {
  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Markets</h1>
        <ErrorBoundary>
          <InstrumentSearch />
        </ErrorBoundary>
      </div>
    </div>
  )
}

import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { InstrumentSearch } from "@/components/markets/instrument-search"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function MarketsPage() {
  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Portfolio
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-xl font-semibold">Markets</h1>
        </div>
        <ErrorBoundary>
          <InstrumentSearch />
        </ErrorBoundary>
      </div>
    </div>
  )
}

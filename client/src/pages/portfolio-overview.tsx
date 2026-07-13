import { Banknote, Briefcase, TrendingUp } from "lucide-react"
import { Suspense } from "react"
import { Link } from "react-router-dom"
import { ErrorBoundary } from "@/components/error-boundary"
import { ImportTransactionsDialog } from "@/components/import/import-transactions-dialog"
import { MarketsLink } from "@/components/markets/markets-link"
import { HoldingsTable } from "@/components/portfolio/portfolio-holdings-table"
import { PerformanceCard } from "@/components/portfolio/portfolio-performance-card"
import { PortfolioRecommendation } from "@/components/portfolio/portfolio-recommendation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import {
  type PortfolioHolding,
  usePortfolioOverview,
} from "@/network/endpoints/portfolio"

function Loading() {
  return (
    <div className="flex w-full max-w-4xl animate-pulse flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-32 rounded bg-muted" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-40 w-full rounded bg-muted" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 w-full rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const TRADING_TRANSACTIONS_URL = "/transactions?category=TRADING"
const CASH_TRANSACTIONS_URL = "/transactions?category=CASH"

function groupByAssetClass(holdings: PortfolioHolding[]): Map<string, number> {
  const groups = new Map<string, number>()
  for (const h of holdings) {
    const key = h.assetClass ?? "Other"
    groups.set(key, (groups.get(key) ?? 0) + (h.currentValue ?? 0))
  }
  return groups
}

function PortfolioContent() {
  const { data: overview } = usePortfolioOverview()
  const holdingsValue = (overview.totalValue ?? 0) - (overview.cashBalance ?? 0)
  const byClass = groupByAssetClass(overview.holdings ?? [])

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/transactions" className="block">
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="size-4" />
                Total Portfolio
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(
                  overview.totalValue ?? 0,
                  overview.currency ?? "",
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link to={TRADING_TRANSACTIONS_URL} className="block">
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Briefcase className="size-4" />
                Investments
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(holdingsValue, overview.currency ?? "")}
              </CardTitle>
              {byClass.size > 0 && (
                <dl className="mt-1 space-y-0.5">
                  {[...byClass.entries()].map(([cls, value]) => (
                    <div
                      key={cls}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <dt className="text-xs capitalize text-muted-foreground">
                        {cls.toLowerCase()}
                      </dt>
                      <dd className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(value, overview.currency ?? "")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardHeader>
          </Card>
        </Link>

        <Link to={CASH_TRANSACTIONS_URL} className="block">
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Banknote className="size-4" />
                Cash
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatCurrency(
                  overview.cashBalance ?? 0,
                  overview.currency ?? "",
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <PerformanceCard />

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>
            Current positions based on imported transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={overview.holdings ?? []} />
        </CardContent>
      </Card>

      {/* Profile-dependent and optional: hide it rather than failing the whole
          page if the profile fetch errors. */}
      <ErrorBoundary fallback={null}>
        <PortfolioRecommendation overview={overview} />
      </ErrorBoundary>
    </div>
  )
}

export function PortfolioOverviewPage() {
  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Portfolio Overview</h1>
          <div className="flex items-center gap-2">
            <MarketsLink />
            <ImportTransactionsDialog />
          </div>
        </div>

        <ErrorBoundary
          fallback={
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load portfolio data. Please refresh the page to try
              again.
            </p>
          }
        >
          <Suspense fallback={<Loading />}>
            <PortfolioContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

import { ArrowLeft, Banknote, Briefcase, TrendingUp } from "lucide-react"
import { Suspense, useState } from "react"
import { Link } from "react-router-dom"
import { Area, AreaChart, Label, XAxis } from "recharts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  type PortfolioHolding,
  type PortfolioSnapshot,
  usePortfolioOverview,
  usePortfolioPerformance,
} from "@/network/endpoints/portfolio"

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatShares(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value)
}

function formatAxisDate(dateStr: string, range: TimeRange): string {
  if (range === "1D") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr))
  }
  const showDay = range === "1W" || range === "1M"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    ...(showDay ? { day: "numeric" } : { year: "numeric" }),
  }).format(new Date(dateStr))
}

function formatTooltipDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr))
}

// --- Time range ---

type TimeRange = "1D" | "1W" | "1M" | "1Y" | "MAX"

const TIME_RANGES: { label: TimeRange; days: number | null }[] = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "1Y", days: 365 },
  { label: "MAX", days: null },
]

function cutoffDateFor(days: number | null): string | null {
  if (days === null) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0]
}

function filterByRange(
  snapshots: PortfolioSnapshot[],
  range: TimeRange,
): PortfolioSnapshot[] {
  const cutoff = cutoffDateFor(
    TIME_RANGES.find((r) => r.label === range)?.days ?? null,
  )
  return cutoff === null
    ? snapshots
    : snapshots.filter((s) => s.date != null && s.date >= cutoff)
}

interface RangeSelectorProps {
  selected: TimeRange
  onSelect: (r: TimeRange) => void
}

function RangeSelector({ selected, onSelect }: RangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TIME_RANGES.map(({ label }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className={[
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            selected === label
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// --- Performance chart ---

const chartConfig = {
  value: { label: "" },
} satisfies ChartConfig

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[]
  currency: string
  range: TimeRange
}

function PerformanceChart({
  snapshots,
  currency,
  range,
}: PerformanceChartProps) {
  if (snapshots.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Import more transactions to see performance over time.
      </p>
    )
  }

  const data = snapshots.map((s) => ({
    date: s.date ?? "",
    value: s.value ?? 0,
  }))
  const first = snapshots[0].value ?? 0
  const last = snapshots[snapshots.length - 1].value ?? 0
  const isPositive = last >= first

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={
                isPositive ? "var(--color-primary)" : "var(--color-destructive)"
              }
              stopOpacity={0.25}
            />
            <stop
              offset="95%"
              stopColor={
                isPositive ? "var(--color-primary)" : "var(--color-destructive)"
              }
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        {range === "1D" ? (
          <XAxis tick={false} tickLine={false} axisLine={false} height={28}>
            <Label
              value={
                data.length > 0
                  ? formatAxisDate(
                      data[Math.floor(data.length / 2)].date,
                      range,
                    )
                  : ""
              }
              position="center"
              style={{ fontSize: "11px", fill: "currentColor", opacity: 0.6 }}
            />
          </XAxis>
        ) : (
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(d) => formatAxisDate(d, range)}
            tick={{ fontSize: 11 }}
            minTickGap={60}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke={
            isPositive ? "var(--color-primary)" : "var(--color-destructive)"
          }
          strokeWidth={2}
          fill="url(#perfGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.date
                  ? formatTooltipDate(payload[0].payload.date as string)
                  : ""
              }
              formatter={(value) => [
                formatCurrency(Number(value), currency),
                "",
              ]}
            />
          }
        />
      </AreaChart>
    </ChartContainer>
  )
}

interface PerformanceChartContentProps {
  range: TimeRange
}

function PerformanceChartContent({ range }: PerformanceChartContentProps) {
  const { data: performance } = usePortfolioPerformance()
  const filtered = filterByRange(performance.snapshots ?? [], range)
  return (
    <PerformanceChart
      snapshots={filtered}
      currency={performance.currency ?? ""}
      range={range}
    />
  )
}

function PerformanceCard() {
  const [range, setRange] = useState<TimeRange>("MAX")

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle>Performance</CardTitle>
          <CardDescription>Portfolio value over time</CardDescription>
        </div>
        <RangeSelector selected={range} onSelect={setRange} />
      </CardHeader>
      <CardContent className="pb-4">
        <Suspense
          fallback={
            <div className="h-40 w-full animate-pulse rounded bg-muted" />
          }
        >
          <PerformanceChartContent range={range} />
        </Suspense>
      </CardContent>
    </Card>
  )
}

// --- Holdings table ---

interface HoldingTableProps {
  holdings: PortfolioHolding[]
}

function HoldingsTable({ holdings }: HoldingTableProps) {
  if (holdings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No holdings found. Import transactions to see your portfolio.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Class</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Last Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding, i) => (
          <TableRow key={holding.symbol ?? i}>
            <TableCell className="font-medium">
              {holding.name ?? holding.symbol}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {holding.symbol}
            </TableCell>
            <TableCell>{holding.assetClass ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatShares(holding.shares ?? 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {holding.lastPrice != null
                ? formatCurrency(holding.lastPrice, holding.currency ?? "")
                : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatCurrency(
                holding.currentValue ?? 0,
                holding.currency ?? "",
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// --- Asset class grouping ---

function groupByAssetClass(holdings: PortfolioHolding[]): Map<string, number> {
  const groups = new Map<string, number>()
  for (const h of holdings) {
    const key = h.assetClass ?? "Other"
    groups.set(key, (groups.get(key) ?? 0) + (h.currentValue ?? 0))
  }
  return groups
}

// --- Main content ---

function PortfolioContent() {
  const { data: overview } = usePortfolioOverview()

  const holdingsValue = (overview.totalValue ?? 0) - (overview.cashBalance ?? 0)
  const byClass = groupByAssetClass(overview.holdings ?? [])

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
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

        <Card>
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

        <Card>
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
    </div>
  )
}

// --- Skeleton ---

function PortfolioSkeleton() {
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

// --- Page ---

export function PortfolioOverviewPage() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-xl font-semibold">Portfolio Overview</h1>
        </div>

        <Suspense fallback={<PortfolioSkeleton />}>
          <PortfolioContent />
        </Suspense>
      </div>
    </div>
  )
}

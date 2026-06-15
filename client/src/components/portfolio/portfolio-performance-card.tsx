import { Suspense, useMemo, useState } from "react"
import { Area, AreaChart, XAxis } from "recharts"
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
import { formatCurrency } from "@/lib/format"
import {
  type PortfolioSnapshot,
  usePortfolioPerformance,
} from "@/network/endpoints/portfolio"

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

export function filterByRange(
  snapshots: PortfolioSnapshot[],
  range: TimeRange,
): PortfolioSnapshot[] {
  const cutoff = cutoffDateFor(
    TIME_RANGES.find((r) => r.label === range)?.days ?? null,
  )
  return cutoff === null
    ? snapshots
    : snapshots.filter((s) => s.datetime != null && s.datetime >= cutoff)
}

function formatAxisDate(timestampMs: number, range: TimeRange): string {
  const d = new Date(timestampMs)
  if (range === "1D") {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d)
  }
  const showDay = range === "1W" || range === "1M"
  return new Intl.DateTimeFormat("en", {
    month: "short",
    ...(showDay ? { day: "numeric" } : { year: "numeric" }),
  }).format(d)
}

function formatTooltipDate(timestampMs: number, range: TimeRange): string {
  const d = new Date(timestampMs)
  if (range === "1D") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d)
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

const STEP_MS: Record<TimeRange, number> = {
  "1D": 4 * 60 * 60 * 1000,
  "1W": 24 * 60 * 60 * 1000,
  "1M": 7 * 24 * 60 * 60 * 1000,
  "1Y": 30 * 24 * 60 * 60 * 1000,
  MAX: 90 * 24 * 60 * 60 * 1000,
}

function computeEquidistantTicks(
  minMs: number,
  maxMs: number,
  range: TimeRange,
): number[] {
  let stepMs = STEP_MS[range]

  if (range === "MAX") {
    const durationDays = (maxMs - minMs) / (24 * 60 * 60 * 1000)
    if (durationDays <= 30) stepMs = 7 * 24 * 60 * 60 * 1000
    else if (durationDays <= 90) stepMs = 14 * 24 * 60 * 60 * 1000
    else if (durationDays <= 365) stepMs = 30 * 24 * 60 * 60 * 1000
    else stepMs = 90 * 24 * 60 * 60 * 1000
  }

  const firstTick = Math.ceil(minMs / stepMs) * stepMs
  const ticks: number[] = []
  for (let t = firstTick; t <= maxMs; t += stepMs) {
    ticks.push(t)
  }
  return ticks
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

const chartConfig = {
  investmentValue: { label: "Investments" },
  cashValue: { label: "Cash" },
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
  const data = snapshots
    .map((s) => ({
      t: new Date(s.datetime ?? "").getTime(),
      investmentValue: s.investmentValue ?? 0,
      cashValue: s.cashValue ?? 0,
    }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t)

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Import more transactions to see performance over time.
      </p>
    )
  }

  const minMs = data[0].t
  const maxMs = data[data.length - 1].t
  const ticks = computeEquidistantTicks(minMs, maxMs, range)

  const first = data[0].investmentValue
  const last = data[data.length - 1].investmentValue
  const isPositive = last >= first

  const investmentColor = isPositive
    ? "var(--color-primary)"
    : "var(--color-destructive)"

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="investGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={investmentColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={investmentColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          type="number"
          domain={[minMs, maxMs]}
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => formatAxisDate(v as number, range)}
          tick={{ fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="investmentValue"
          stroke={investmentColor}
          strokeWidth={2}
          fill="url(#investGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="cashValue"
          stroke="var(--color-chart-1)"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const t = payload?.[0]?.payload?.t
                return typeof t === "number" ? formatTooltipDate(t, range) : ""
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value), currency),
                name === "investmentValue" ? "Investments" : "Cash",
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
  const filtered = useMemo(
    () => filterByRange(performance.snapshots ?? [], range),
    [performance.snapshots, range],
  )
  return (
    <PerformanceChart
      snapshots={filtered}
      currency={performance.currency ?? ""}
      range={range}
    />
  )
}

/** Self-contained card showing portfolio performance chart with time range selector. */
export function PerformanceCard() {
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

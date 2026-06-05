import { Suspense, useState } from "react"
import { Area, AreaChart, Label, XAxis } from "recharts"
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
    : snapshots.filter((s) => s.date != null && s.date >= cutoff)
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

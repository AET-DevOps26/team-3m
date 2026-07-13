import { Suspense, startTransition, useState } from "react"
import { Area, AreaChart, XAxis } from "recharts"
import { RangeSelector } from "@/components/charts/range-selector"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  computeEquidistantTicks,
  formatAxisDate,
  formatTooltipDate,
  type TimeRange,
} from "@/lib/chart-time"
import { formatCurrency } from "@/lib/format"
import {
  useInstrumentHistory,
  useInstrumentQuote,
} from "@/network/endpoints/market-data"

const chartConfig = {
  close: { label: "Price" },
} satisfies ChartConfig

interface QuoteSummaryProps {
  symbol: string
}

function QuoteSummary({ symbol }: QuoteSummaryProps) {
  const { data: quote } = useInstrumentQuote(symbol)
  const change = quote.change ?? 0
  const isPositive = change >= 0
  const changeColor = isPositive ? "text-primary" : "text-destructive"
  const sign = isPositive ? "+" : ""

  return (
    <div className="flex flex-col gap-1">
      <CardTitle className="text-2xl tabular-nums">
        {formatCurrency(quote.price, quote.currency ?? "")}
      </CardTitle>
      <p className={`text-sm tabular-nums ${changeColor}`}>
        {sign}
        {formatCurrency(change, quote.currency ?? "")} ({sign}
        {(quote.changePercent ?? 0).toFixed(2)}%)
      </p>
    </div>
  )
}

interface PriceChartProps {
  symbol: string
  range: TimeRange
}

function PriceChart({ symbol, range }: PriceChartProps) {
  const { data: history } = useInstrumentHistory(symbol, range)
  const data = history.series
    .map((point) => ({
      t: new Date(point.timestamp).getTime(),
      close: point.close,
    }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t)

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No price history available for this range.
      </p>
    )
  }

  const minMs = data[0].t
  const maxMs = data[data.length - 1].t
  const ticks = computeEquidistantTicks(minMs, maxMs, range)

  const isPositive = data[data.length - 1].close >= data[0].close
  const lineColor = isPositive
    ? "var(--color-primary)"
    : "var(--color-destructive)"

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
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
          tick={(props) => {
            const { x, y, payload, index } = props as {
              x: number
              y: number
              payload: { value: number }
              index: number
            }
            const anchor =
              index === 0
                ? "start"
                : index === ticks.length - 1
                  ? "end"
                  : "middle"
            return (
              <text x={x} y={y} textAnchor={anchor} fontSize={11}>
                {formatAxisDate(payload.value, range)}
              </text>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const t = payload?.[0]?.payload?.t
                return typeof t === "number" ? formatTooltipDate(t, range) : ""
              }}
              formatter={(value) => (
                <span className="font-medium tabular-nums">
                  {formatCurrency(Number(value), history.currency ?? "")}
                </span>
              )}
            />
          }
        />
      </AreaChart>
    </ChartContainer>
  )
}

interface InstrumentPriceViewProps {
  symbol: string
  name?: string
}

/**
 * Card-less live price view: current quote with day change and a historical
 * price chart over a selectable time range, both backed by the core
 * market-data endpoints. Rendered inside a `Card` by `InstrumentPriceCard` on
 * the market detail page, and directly inside the holdings chart dialog.
 */
export function InstrumentPriceView({
  symbol,
  name,
}: InstrumentPriceViewProps) {
  const [range, setRange] = useState<TimeRange>("1M")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{name ?? symbol}</p>
          <Suspense
            fallback={
              <div className="h-14 w-40 animate-pulse rounded bg-muted" />
            }
          >
            <QuoteSummary symbol={symbol} />
          </Suspense>
        </div>
        <RangeSelector
          selected={range}
          onSelect={(r) => startTransition(() => setRange(r))}
        />
      </div>
      <Suspense
        fallback={
          <div className="h-48 w-full animate-pulse rounded bg-muted" />
        }
      >
        <PriceChart symbol={symbol} range={range} />
      </Suspense>
    </div>
  )
}

interface InstrumentPriceCardProps {
  symbol: string
  name?: string
}

/**
 * Live price card for the market detail page: wraps `InstrumentPriceView` in a
 * `Card` surface.
 */
export function InstrumentPriceCard({
  symbol,
  name,
}: InstrumentPriceCardProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <InstrumentPriceView symbol={symbol} name={name} />
      </CardContent>
    </Card>
  )
}

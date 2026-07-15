export type TimeRange = "1D" | "1W" | "1M" | "1Y" | "MAX"

export const TIME_RANGES: { label: TimeRange; days: number | null }[] = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "1Y", days: 365 },
  { label: "MAX", days: null },
]

export function formatAxisDate(timestampMs: number, range: TimeRange): string {
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

export function formatTooltipDate(
  timestampMs: number,
  range: TimeRange,
): string {
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

const STEP_MS: Record<"1W" | "1M", number> = {
  "1W": 24 * 60 * 60 * 1000,
  "1M": 7 * 24 * 60 * 60 * 1000,
}

const INTRADAY_TICK_COUNT = 5

function evenlySpacedTicks(
  minMs: number,
  maxMs: number,
  count: number,
): number[] {
  if (maxMs <= minMs || count < 2) {
    return [minMs]
  }
  const step = (maxMs - minMs) / (count - 1)
  return Array.from({ length: count }, (_, i) => Math.round(minMs + i * step))
}

export function computeEquidistantTicks(
  minMs: number,
  maxMs: number,
  range: TimeRange,
): number[] {
  // 1Y and MAX use calendar-aligned month boundaries to avoid duplicate labels
  if (range === "1Y" || range === "MAX") {
    const durationDays = (maxMs - minMs) / (24 * 60 * 60 * 1000)
    let stepMonths = 1
    if (durationDays > 730) stepMonths = 6
    else if (durationDays > 365) stepMonths = 3

    const start = new Date(minMs)
    let current = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const ticks: number[] = []
    while (current.getTime() <= maxMs) {
      ticks.push(current.getTime())
      current = new Date(
        current.getFullYear(),
        current.getMonth() + stepMonths,
        1,
      )
    }
    return ticks
  }

  if (range === "1D") {
    return evenlySpacedTicks(minMs, maxMs, INTRADAY_TICK_COUNT)
  }

  const stepMs = STEP_MS[range as "1W" | "1M"]
  // Prepend minMs so the first data point always has a label
  const seen = new Set<number>([minMs])
  const ticks: number[] = [minMs]
  const firstEquidistantTick = Math.ceil(minMs / stepMs) * stepMs
  for (let t = firstEquidistantTick; t <= maxMs; t += stepMs) {
    if (!seen.has(t)) {
      seen.add(t)
      ticks.push(t)
    }
  }
  return ticks
}

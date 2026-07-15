import { describe, expect, it } from "vitest"
import { computeEquidistantTicks } from "@/lib/chart-time"

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

describe("computeEquidistantTicks — 1D", () => {
  it("returns several distinct ticks across a partial early session", () => {
    const min = Date.UTC(2026, 6, 14, 13, 30)
    const max = min + HOUR_MS

    const ticks = computeEquidistantTicks(min, max, "1D")

    expect(ticks.length).toBeGreaterThan(1)
    expect(new Set(ticks).size).toBe(ticks.length)
    expect(ticks[0]).toBe(min)
    expect(ticks[ticks.length - 1]).toBe(max)
  })

  it("spans the whole session and stays within the data range", () => {
    const min = Date.UTC(2026, 6, 14, 13, 30)
    const max = Date.UTC(2026, 6, 14, 20, 0)

    const ticks = computeEquidistantTicks(min, max, "1D")

    expect(ticks.length).toBeGreaterThan(2)
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(min)
      expect(t).toBeLessThanOrEqual(max)
    }
  })

  it("collapses to a single tick when the range has no width", () => {
    const min = Date.UTC(2026, 6, 14, 13, 30)

    expect(computeEquidistantTicks(min, min, "1D")).toEqual([min])
  })
})

describe("computeEquidistantTicks — other ranges", () => {
  it("steps daily for 1W and always labels the first point", () => {
    const min = Date.UTC(2026, 6, 8, 9, 15)
    const max = min + 7 * DAY_MS

    const ticks = computeEquidistantTicks(min, max, "1W")

    expect(ticks[0]).toBe(min)
    expect(ticks.length).toBeGreaterThan(1)
  })

  it("aligns 1Y ticks to month boundaries", () => {
    const min = Date.UTC(2025, 0, 15)
    const max = Date.UTC(2025, 11, 15)

    const ticks = computeEquidistantTicks(min, max, "1Y")

    expect(ticks.length).toBeGreaterThan(1)
    for (const t of ticks) {
      expect(new Date(t).getDate()).toBe(1)
    }
  })
})

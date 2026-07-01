import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  type Filters,
  filtersToApiParams,
  hasActiveFilters,
  INITIAL_FILTERS,
} from "./transaction-filters"

function makeFilters(overrides: Partial<Filters> = {}): Filters {
  return { ...INITIAL_FILTERS, ...overrides }
}

describe("filtersToApiParams", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Local-time constructor keeps getFullYear/Month/Date deterministic
    // regardless of the runner's timezone. 2026-06-15, midday.
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("maps empty text filters to undefined", () => {
    expect(filtersToApiParams(INITIAL_FILTERS)).toEqual({
      search: undefined,
      category: undefined,
      type: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    })
  })

  it("passes through non-empty text filters", () => {
    const params = filtersToApiParams(
      makeFilters({ search: "coffee", category: "food", type: "expense" }),
    )
    expect(params.search).toBe("coffee")
    expect(params.category).toBe("food")
    expect(params.type).toBe("expense")
  })

  it("resolves the 30-day preset to a 30-day window ending today", () => {
    const params = filtersToApiParams(makeFilters({ datePreset: "30d" }))
    expect(params.dateFrom).toBe("2026-05-16")
    expect(params.dateTo).toBe("2026-06-15")
  })

  it("resolves the 3-month preset to a 3-month window ending today", () => {
    const params = filtersToApiParams(makeFilters({ datePreset: "3m" }))
    expect(params.dateFrom).toBe("2026-03-15")
    expect(params.dateTo).toBe("2026-06-15")
  })

  it("clamps the 3-month start to the last valid day of a shorter month", () => {
    // From May 31, three months back is February, which has no 31st.
    vi.setSystemTime(new Date(2026, 4, 31, 12, 0, 0))
    const params = filtersToApiParams(makeFilters({ datePreset: "3m" }))
    expect(params.dateFrom).toBe("2026-02-28")
    expect(params.dateTo).toBe("2026-05-31")
  })

  it("passes through custom dates when both are set", () => {
    const params = filtersToApiParams(
      makeFilters({
        datePreset: "custom",
        customFrom: "2026-01-01",
        customTo: "2026-01-31",
      }),
    )
    expect(params.dateFrom).toBe("2026-01-01")
    expect(params.dateTo).toBe("2026-01-31")
  })

  it("omits custom dates that are not filled in", () => {
    const params = filtersToApiParams(makeFilters({ datePreset: "custom" }))
    expect(params.dateFrom).toBeUndefined()
    expect(params.dateTo).toBeUndefined()
  })

  it("emits no date bounds for the 'all' preset", () => {
    const params = filtersToApiParams(makeFilters({ datePreset: "all" }))
    expect(params.dateFrom).toBeUndefined()
    expect(params.dateTo).toBeUndefined()
  })
})

describe("hasActiveFilters", () => {
  it("is false for the initial filters", () => {
    expect(hasActiveFilters(INITIAL_FILTERS)).toBe(false)
  })

  it("is true when a search term is set", () => {
    expect(hasActiveFilters(makeFilters({ search: "rent" }))).toBe(true)
  })

  it("is true when a category is set", () => {
    expect(hasActiveFilters(makeFilters({ category: "food" }))).toBe(true)
  })

  it("is true when a type is set", () => {
    expect(hasActiveFilters(makeFilters({ type: "income" }))).toBe(true)
  })

  it("is true when the date preset is not 'all'", () => {
    expect(hasActiveFilters(makeFilters({ datePreset: "30d" }))).toBe(true)
  })
})

export type DatePreset = "all" | "30d" | "3m" | "custom"

export interface Filters {
  search: string
  category: string
  type: string
  datePreset: DatePreset
  customFrom: string
  customTo: string
}

export const INITIAL_FILTERS: Filters = {
  search: "",
  category: "",
  type: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
}

export const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "All time", value: "all" },
  { label: "30 days", value: "30d" },
  { label: "3 months", value: "3m" },
  { label: "Custom", value: "custom" },
]

export function filtersToApiParams(filters: Filters): {
  search?: string
  category?: string
  type?: string
  dateFrom?: string
  dateTo?: string
} {
  return {
    search: filters.search || undefined,
    category: filters.category || undefined,
    type: filters.type || undefined,
    dateFrom: resolveDateFrom(filters) ?? undefined,
    dateTo: resolveDateTo(filters) ?? undefined,
  }
}

function resolveDateFrom(filters: Filters): string | null {
  if (filters.datePreset === "30d") {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }
  if (filters.datePreset === "3m") {
    const d = new Date()
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() - 3)
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, daysInMonth))
    return d.toISOString().slice(0, 10)
  }
  if (filters.datePreset === "custom" && filters.customFrom)
    return filters.customFrom
  return null
}

function resolveDateTo(filters: Filters): string | null {
  if (filters.datePreset === "custom" && filters.customTo)
    return filters.customTo
  return null
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search !== "" ||
    filters.category !== "" ||
    filters.type !== "" ||
    filters.datePreset !== "all"
  )
}

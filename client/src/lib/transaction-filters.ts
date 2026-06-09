import { normalizeType } from "@/components/transactions/transaction-row"
import type { Transaction } from "@/network/endpoints/transactions"

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

function getFromDate(preset: DatePreset, customFrom: string): string | null {
  if (preset === "30d") {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }
  if (preset === "3m") {
    const d = new Date()
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() - 3)
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, daysInMonth))
    return d.toISOString().slice(0, 10)
  }
  if (preset === "custom" && customFrom) return customFrom
  return null
}

export function applyFilters(
  transactions: Transaction[],
  filters: Filters,
): Transaction[] {
  const { search, category, type, datePreset, customFrom, customTo } = filters
  const searchLower = search.toLowerCase()
  const fromDate = getFromDate(datePreset, customFrom)
  const toDate = datePreset === "custom" && customTo ? customTo : null

  return transactions.filter((tx) => {
    if (search) {
      const haystack = [tx.name, tx.counterpartyName, tx.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(searchLower)) return false
    }
    if (category && tx.category !== category) return false
    if (type && normalizeType(tx.type) !== type) return false
    if (fromDate && tx.date < fromDate) return false
    if (toDate && tx.date > toDate) return false
    return true
  })
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search !== "" ||
    filters.category !== "" ||
    filters.type !== "" ||
    filters.datePreset !== "all"
  )
}

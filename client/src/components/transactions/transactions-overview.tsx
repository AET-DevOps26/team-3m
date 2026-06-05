import { AlertCircle, List, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  applyFilters,
  type Filters,
  INITIAL_FILTERS,
} from "@/lib/transaction-filters"
import { useTransactions } from "@/network/endpoints/transactions"
import { FiltersBar } from "./filters-bar"
import {
  normalizeType,
  TransactionRow,
  TransactionRowSkeleton,
} from "./transaction-row"

const PAGE_SIZE = 25

export function TransactionsOverviewBlock() {
  const { data: transactions, isPending, isError, error } = useTransactions()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(
    () =>
      [...new Set((transactions ?? []).map((t) => t.category))]
        .filter(Boolean)
        .sort(),
    [transactions],
  )

  const types = useMemo(
    () =>
      [
        ...new Set(
          transactions
            .filter(
              (t) => filters.category === "" || t.category === filters.category,
            )
            .map((t) => normalizeType(t.type))
            .filter((t) => t !== ""),
        ),
      ].sort(),
    [transactions, filters.category],
  )

  const filtered = useMemo(
    () => applyFilters(transactions ?? [], filters),
    [transactions, filters],
  )

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  const hasMore = visibleCount < filtered.length

  // Infinite scroll: observe sentinel element at bottom of list
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, filtered.length])

  function patchFilters(patch: Partial<Filters>) {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      // Reset type when category changes — the current type may not exist in the new category
      if (patch.category !== undefined && patch.category !== prev.category) {
        next.type = ""
      }
      return next
    })
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
    setVisibleCount(PAGE_SIZE)
  }

  if (isPending) {
    return (
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Failed to load transactions</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
      </Alert>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <List className="size-8" />
        <p className="text-sm">
          No transactions yet. Import a CSV to get started.
        </p>
      </div>
    )
  }

  return (
    <div>
      <FiltersBar
        filters={filters}
        categories={categories}
        types={types}
        onChange={patchFilters}
        onReset={resetFilters}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Search className="size-8" />
          <p className="text-sm">No transactions match your filters.</p>
        </div>
      ) : (
        <>
          <div className="divide-y">
            {visible.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
                <TransactionRowSkeleton key={i} />
              ))}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing {visible.length} of {filtered.length} transactions
          </p>
        </>
      )}
    </div>
  )
}

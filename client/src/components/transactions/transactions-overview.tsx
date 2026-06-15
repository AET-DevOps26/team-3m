import { AlertCircle, List, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type Filters, INITIAL_FILTERS } from "@/lib/transaction-filters"
import { useDebounce } from "@/lib/use-debounce"
import {
  useTransactionMetadata,
  useTransactions,
} from "@/network/endpoints/transactions"
import { APIError } from "@/network/errors"
import { FiltersBar } from "./filters-bar"
import {
  normalizeType,
  TransactionRow,
  TransactionRowSkeleton,
} from "./transaction-row"

export function TransactionsOverviewBlock() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const debouncedSearch = useDebounce(filters.search, 300)
  const apiFilters = { ...filters, search: debouncedSearch }

  const { data: metadata } = useTransactionMetadata()
  const categories = metadata?.categories ?? []
  const types = (metadata?.types ?? [])
    .map(normalizeType)
    .filter((t) => t !== "")
    .sort()

  const {
    data: transactions,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useTransactions(apiFilters)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function patchFilters(patch: Partial<Filters>) {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      if (patch.category !== undefined && patch.category !== prev.category) {
        next.type = ""
      }
      return next
    })
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
  }

  const filtersBar = (
    <FiltersBar
      filters={filters}
      categories={categories}
      types={types}
      onChange={patchFilters}
      onReset={resetFilters}
    />
  )

  if (isPending) {
    return (
      <>
        {filtersBar}
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      </>
    )
  }

  if (isError) {
    return (
      <>
        {filtersBar}
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertTitle>Failed to load transactions</AlertTitle>
          <AlertDescription>
            {error instanceof APIError
              ? error.message
              : "Something went wrong. Please try again."}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  if (transactions.length === 0 && !hasNextPage) {
    const hasFilters =
      debouncedSearch ||
      filters.category ||
      filters.type ||
      filters.datePreset !== "all"

    if (hasFilters) {
      return (
        <>
          {filtersBar}
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Search className="size-8" />
            <p className="text-sm">No transactions match your filters.</p>
          </div>
        </>
      )
    }

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
      {filtersBar}

      <div className="divide-y">
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>

      {(hasNextPage || isFetchingNextPage) && (
        <div ref={sentinelRef} className="pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no meaningful key
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  )
}

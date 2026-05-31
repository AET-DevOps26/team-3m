import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  List,
  Search,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type Transaction,
  useTransactions,
} from "@/network/endpoints/transactions"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25
const ALL_VALUE = "_all"

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type DatePreset = "all" | "30d" | "3m" | "custom"

interface Filters {
  search: string
  category: string
  type: string
  datePreset: DatePreset
  customFrom: string
  customTo: string
}

const INITIAL_FILTERS: Filters = {
  search: "",
  category: "",
  type: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "All time", value: "all" },
  { label: "30 days", value: "30d" },
  { label: "3 months", value: "3m" },
  { label: "Custom", value: "custom" },
]

// ---------------------------------------------------------------------------
// Filtering logic
// ---------------------------------------------------------------------------

function getFromDate(preset: DatePreset, customFrom: string): string | null {
  if (preset === "30d") {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }
  if (preset === "3m") {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  }
  if (preset === "custom" && customFrom) return customFrom
  return null
}

function applyFilters(
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
    if (type && tx.type !== type) return false
    if (fromDate && tx.date < fromDate) return false
    if (toDate && tx.date > toDate) return false
    return true
  })
}

function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.search !== "" ||
    filters.category !== "" ||
    filters.type !== "" ||
    filters.datePreset !== "all"
  )
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(
    n,
  )
}

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

interface TransactionRowProps {
  tx: Transaction
  isExpanded: boolean
  onToggle: () => void
}

function TransactionRow({ tx, isExpanded, onToggle }: TransactionRowProps) {
  const isPositive = tx.amount >= 0

  const hasExpandableDetails =
    tx.fee != null ||
    tx.tax != null ||
    tx.counterpartyIban != null ||
    tx.paymentReference != null ||
    (tx.shares != null && tx.price != null) ||
    tx.originalAmount != null

  return (
    <div>
      <button
        type="button"
        onClick={hasExpandableDetails ? onToggle : undefined}
        className={`flex w-full items-center gap-3 py-2 text-left transition-colors ${
          hasExpandableDetails
            ? "-mx-1 cursor-pointer rounded-md px-1 hover:bg-muted/40"
            : "cursor-default"
        }`}
      >
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            isPositive
              ? "bg-success/15 text-success"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {isPositive ? (
            <ArrowDownLeft className="size-4" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {tx.name ?? tx.counterpartyName ?? tx.description ?? tx.category}
          </p>
          <p className="text-xs text-muted-foreground">{tx.date}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p
              className={`text-sm font-medium tabular-nums ${
                isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {isPositive ? "+" : ""}
              {formatAmount(tx.amount, tx.currency)}
            </p>
            <Badge variant="outline" className="text-xs">
              {tx.category}
            </Badge>
          </div>
          {hasExpandableDetails && (
            <span className="text-muted-foreground">
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          )}
        </div>
      </button>

      {isExpanded && hasExpandableDetails && (
        <div className="mb-2 ml-11 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-muted/30 p-3 text-xs">
          {tx.shares != null && tx.price != null && (
            <>
              <span className="text-muted-foreground">Shares × Price</span>
              <span className="tabular-nums">
                {formatNumber(tx.shares)} ×{" "}
                {formatAmount(tx.price, tx.currency)}
              </span>
            </>
          )}
          {tx.fee != null && (
            <>
              <span className="text-muted-foreground">Fee</span>
              <span className="tabular-nums text-destructive">
                {formatAmount(tx.fee, tx.currency)}
              </span>
            </>
          )}
          {tx.tax != null && (
            <>
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums text-destructive">
                {formatAmount(tx.tax, tx.currency)}
              </span>
            </>
          )}
          {tx.originalAmount != null && tx.originalCurrency != null && (
            <>
              <span className="text-muted-foreground">Original amount</span>
              <span className="tabular-nums">
                {formatAmount(tx.originalAmount, tx.originalCurrency)}
                {tx.fxRate != null && (
                  <span className="ml-1 text-muted-foreground">
                    @ {formatNumber(tx.fxRate)}
                  </span>
                )}
              </span>
            </>
          )}
          {tx.counterpartyIban != null && (
            <>
              <span className="text-muted-foreground">IBAN</span>
              <span className="font-mono">{tx.counterpartyIban}</span>
            </>
          )}
          {tx.paymentReference != null && (
            <>
              <span className="text-muted-foreground">Reference</span>
              <span>{tx.paymentReference}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TransactionRowSkeleton
// ---------------------------------------------------------------------------

function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="space-y-1.5 text-right">
        <Skeleton className="ml-auto h-4 w-16" />
        <Skeleton className="ml-auto h-5 w-12" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FiltersBar
// ---------------------------------------------------------------------------

interface FiltersBarProps {
  filters: Filters
  categories: string[]
  types: string[]
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

function FiltersBar({
  filters,
  categories,
  types,
  onChange,
  onReset,
}: FiltersBarProps) {
  const isActive = hasActiveFilters(filters)

  return (
    <div className="space-y-3 pb-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, counterparty, description…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="pl-8"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={filters.category === "" ? ALL_VALUE : filters.category}
          onValueChange={(v) =>
            onChange({ category: v === ALL_VALUE ? "" : v })
          }
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type === "" ? ALL_VALUE : filters.type}
          onValueChange={(v) => onChange({ type: v === ALL_VALUE ? "" : v })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map(({ label, value }) => (
          <Button
            key={value}
            variant={filters.datePreset === value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ datePreset: value })}
          >
            {label}
          </Button>
        ))}
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto gap-1 text-muted-foreground"
          >
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {filters.datePreset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.customFrom}
            onChange={(e) => onChange({ customFrom: e.target.value })}
            className="flex-1"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="date"
            value={filters.customTo}
            onChange={(e) => onChange({ customTo: e.target.value })}
            className="flex-1"
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TransactionsBlock (main export)
// ---------------------------------------------------------------------------

export function TransactionsBlock() {
  const { data: transactions, isPending, isError, error } = useTransactions()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(
    () => [...new Set((transactions ?? []).map((t) => t.category))].sort(),
    [transactions],
  )

  const types = useMemo(
    () => [...new Set((transactions ?? []).map((t) => t.type))].sort(),
    [transactions],
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
    setFilters((prev) => ({ ...prev, ...patch }))
    setExpandedId(null)
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
    setExpandedId(null)
    setVisibleCount(PAGE_SIZE)
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
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
        <AlertDescription>{error.message}</AlertDescription>
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
              <TransactionRow
                key={tx.id}
                tx={tx}
                isExpanded={expandedId === tx.id}
                onToggle={() => toggleExpanded(tx.id)}
              />
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

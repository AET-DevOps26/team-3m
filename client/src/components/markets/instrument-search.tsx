import { Search, SearchX } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/lib/use-debounce"
import {
  type InstrumentMatch,
  useInstrumentSearch,
} from "@/network/endpoints/market-data"
import { APIError } from "@/network/errors"

const SEARCH_DEBOUNCE_MS = 300

/**
 * Instrument search box for the markets page: a debounced text input backed by
 * the market-data search endpoint, rendering matches as links to the
 * per-symbol detail page.
 */
export function InstrumentSearch() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
  const {
    data: matches,
    isPending,
    isError,
    error,
  } = useInstrumentSearch(debouncedQuery)

  const isIdle = debouncedQuery.trim().length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by ticker or company name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          autoFocus
        />
      </div>
      <SearchResults
        isIdle={isIdle}
        isPending={isPending}
        isError={isError}
        error={error}
        matches={matches ?? []}
        query={debouncedQuery}
      />
    </div>
  )
}

interface SearchResultsProps {
  isIdle: boolean
  isPending: boolean
  isError: boolean
  error: unknown
  matches: InstrumentMatch[]
  query: string
}

function SearchResults({
  isIdle,
  isPending,
  isError,
  error,
  matches,
  query,
}: SearchResultsProps) {
  if (isIdle) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Search for a stock or ETF to see its live price and history.
      </p>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Search failed</AlertTitle>
        <AlertDescription>
          {error instanceof APIError
            ? error.message
            : "Something went wrong. Please try again."}
        </AlertDescription>
      </Alert>
    )
  }

  if (isPending) {
    return (
      <div className="flex animate-pulse flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 w-full rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <SearchX className="size-6" />
        <p className="text-sm">No instruments found for “{query.trim()}”.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y rounded-md border">
      {matches.map((match) => (
        <li key={`${match.symbol}-${match.exchange}`}>
          <Link
            to={`/markets/${encodeURIComponent(match.symbol)}`}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50"
          >
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {match.symbol}
            </Badge>
            <span className="flex-1 truncate text-sm">
              {match.name ?? match.symbol}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {[match.exchange, match.currency].filter(Boolean).join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

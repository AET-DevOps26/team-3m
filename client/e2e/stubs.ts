// Factories for stubbed API responses used by the E2E tests. Routing real
// backend responses is non-deterministic (live prices, empty CI database), so
// data-dependent tests intercept the relevant endpoints and assert against
// these fixtures instead. Ids use a valid RFC-4122 v4 UUID because the client
// validates them with z.uuid(), and datetimes use an explicit +00:00 offset to
// match the offset-aware parsing the client applies.

import type { Route } from "@playwright/test"

/** A valid RFC-4122 v4 UUID (version 4, variant 8). */
export const UUID = "00000000-0000-4000-8000-000000000000"

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
}

/** Wraps a payload in the API's standard success envelope. */
export function envelope<T>(data: T) {
  return { success: true, data, error: null, details: null }
}

/** Fulfills a route with a success-envelope JSON body. */
export function fulfillOk(route: Route, data: unknown) {
  return route.fulfill({ json: envelope(data) })
}

// --- Profile ---------------------------------------------------------------

export function profile(riskTolerance: string | null = "MODERATE") {
  return {
    id: UUID,
    email: "dev@kontor.local",
    preferredUsername: "dev",
    riskTolerance,
  }
}

// --- Portfolio overview ----------------------------------------------------

export interface StubHolding {
  symbol: string
  name: string
  assetClass: string
  currency: string
  shares: number
  lastPrice: number
  currentValue: number
}

export const SAMPLE_HOLDINGS: StubHolding[] = [
  {
    symbol: "US0378331005",
    name: "Apple",
    assetClass: "STOCK",
    currency: "EUR",
    shares: 18,
    lastPrice: 198.76,
    currentValue: 3577.68,
  },
  {
    symbol: "IE00B5BMR087",
    name: "iShares Core S&P 500 UCITS ETF",
    assetClass: "FUND",
    currency: "EUR",
    shares: 8,
    lastPrice: 520,
    currentValue: 4160,
  },
]

export function overview(holdings: StubHolding[] = SAMPLE_HOLDINGS) {
  const investments = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const cashBalance = 1500
  return {
    holdings,
    cashBalance,
    currency: "EUR",
    totalValue: investments + cashBalance,
  }
}

// --- Portfolio performance -------------------------------------------------

function offsetIso(timestampMs: number): string {
  return new Date(timestampMs).toISOString().replace(/\.\d{3}Z$/, "+00:00")
}

/** Snapshots evenly spread from `spanDays` ago to now, enough points for a chart. */
export function performance(count = 40, spanDays = 400) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const denom = Math.max(count - 1, 1)
  const snapshots = Array.from({ length: count }, (_, i) => {
    const t = now - spanDays * dayMs * (1 - i / denom)
    const investmentValue = 10_000 + i * 120
    const cashValue = 1500
    return {
      datetime: offsetIso(t),
      value: investmentValue + cashValue,
      investmentValue,
      cashValue,
    }
  })
  return { snapshots, currency: "EUR" }
}

// --- Transactions ----------------------------------------------------------

export interface StubTransaction {
  id: string
  datetime: string
  date: string
  accountType: string
  category: string
  type: string
  amount: number
  currency: string
  name?: string | null
  symbol?: string | null
  counterpartyName?: string | null
  description?: string | null
}

export function transaction(
  overrides: Partial<StubTransaction> = {},
): StubTransaction {
  return {
    id: uuid(1),
    datetime: "2026-02-03T14:30:00+00:00",
    date: "2026-02-03",
    accountType: "DEFAULT",
    category: "TRADING",
    type: "BUY",
    amount: -1885,
    currency: "EUR",
    name: "Apple",
    symbol: "US0378331005",
    counterpartyName: null,
    description: null,
    ...overrides,
  }
}

export function transactionsPage(items: StubTransaction[]) {
  // Assign each item a distinct, valid id so rows never collide on the
  // React key={tx.id} the transaction list uses, regardless of caller input.
  return {
    items: items.map((item, i) => ({ ...item, id: uuid(i + 1) })),
    nextCursor: null,
  }
}

export function transactionMetadata(
  categories: string[] = ["TRADING", "CASH"],
  types: string[] = ["BUY", "SELL", "CUSTOMER_INBOUND"],
) {
  return { categories, types }
}

// --- AI recommendation -----------------------------------------------------

export function recommendation() {
  return {
    recommendation: "Increase international diversification.",
    rationale: "Your portfolio is concentrated in US large-cap equities.",
    disclaimer: "This is not financial advice.",
  }
}

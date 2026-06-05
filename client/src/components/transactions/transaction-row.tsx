import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Transaction } from "@/network/endpoints/transactions"

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

// IBANs: 2-letter country code + 2 check digits + 4–30 alphanumeric chars.
// Strip spaces first so both "DE89..." and "DE89 3704 ..." are caught.
const IBAN_PATTERN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i

// Boilerplate transfer prefixes produced by brokers/banks before the actual counterparty name
const TRANSFER_PREFIX =
  /^(?:(?:outgoing|incoming)\s+transfer\s+(?:for|from|to)|sepa\s+(?:direct\s+debit\s+)?transfer\s+(?:for|from|to))\s+/i

/** Returns true if the value is blank, contains a UUID, or is a bare IBAN (with or without spaces). */
function isUnreadable(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === "" || UUID_PATTERN.test(trimmed)) return true
  // Remove spaces before testing IBAN so "DE89 3704 0044 0532 0130 00" is also caught
  const noSpaces = trimmed.replace(/\s+/g, "")
  return IBAN_PATTERN.test(noSpaces)
}

// Matches an IBAN (with or without spaces) optionally wrapped in parentheses or brackets
const INLINE_IBAN = /\s*[([]?[A-Z]{2}[0-9]{2}(?:\s?[A-Z0-9]){4,30}[)\]]?\s*/gi

/** Strips boilerplate transfer prefixes and any embedded IBANs from a display value. */
function cleanTitle(value: string): string {
  return value.replace(TRANSFER_PREFIX, "").replace(INLINE_IBAN, " ").trim()
}

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}

// Known overrides for type values that don't format well generically.
// Keys must match the *normalized* form (lowercase, underscores replaced with spaces, qualifiers stripped).
const TYPE_LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  saveback: "Save Back",
  interest: "Interest",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  "card transaction": "Card Payment",
  tax: "Tax",
  fee: "Fee",
  transfer: "Transfer",
  exchange: "Exchange",
  roundup: "Round Up",
  refund: "Refund",
}

const TYPE_QUALIFIERS = new Set([
  "instant",
  "inbound",
  "outbound",
  "international",
])

/**
 * Strips execution/direction qualifiers so variants collapse to one type.
 * Works with both space- and underscore-separated values.
 * e.g. "transfer_instant_inbound" → "transfer", "buy instant" → "buy",
 *      "card_transaction_international" → "card transaction"
 */
export function normalizeType(type: string): string {
  const base = type
    .toLowerCase()
    .trim()
    .replace(/_/g, " ")
    .split(" ")
    .filter((word) => word.length > 0 && !TYPE_QUALIFIERS.has(word))
    .join(" ")

  // Collapse all transfer variants (transfer direct debit, transfer inbound, etc.) into one type
  if (base.startsWith("transfer")) return "transfer"

  return base
}

export function formatType(type: string): string {
  return (
    TYPE_LABELS[normalizeType(type)] ??
    normalizeType(type)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

interface TransactionRowProps {
  tx: Transaction
}

export function TransactionRow({ tx }: TransactionRowProps) {
  const isPositive = tx.amount >= 0

  return (
    <div className="flex items-center gap-3 py-2">
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
          {[tx.name, tx.counterpartyName, tx.description]
            .filter((v): v is string => v != null && !isUnreadable(v))
            .map(cleanTitle)
            .find((v) => v !== "") ?? formatType(tx.type)}
        </p>
        <p className="text-xs text-muted-foreground">{tx.date}</p>
      </div>

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
    </div>
  )
}

// ---------------------------------------------------------------------------
// TransactionRowSkeleton
// ---------------------------------------------------------------------------

export function TransactionRowSkeleton() {
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

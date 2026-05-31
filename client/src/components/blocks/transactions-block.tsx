import { AlertCircle, ArrowDownLeft, ArrowUpRight, List } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type Transaction,
  useTransactions,
} from "@/network/endpoints/transactions"

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isPositive = tx.amount >= 0
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
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
      <div className="text-right">
        <p
          className={`text-sm font-medium tabular-nums ${isPositive ? "text-success" : "text-destructive"}`}
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

export function TransactionsBlock() {
  const { data: transactions, isPending, isError, error } = useTransactions()

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
    <div className="divide-y">
      {transactions.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} />
      ))}
    </div>
  )
}

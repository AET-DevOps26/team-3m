import { useRef, useState } from "react"
import { HoldingChartDialog } from "@/components/portfolio/holding-chart-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"
import type { PortfolioHolding } from "@/network/endpoints/portfolio"

function formatShares(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(value)
}

interface HoldingsTableProps {
  holdings: PortfolioHolding[]
}

/** Table of current portfolio positions based on imported transactions. */
export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [active, setActive] = useState<PortfolioHolding | null>(null)
  const triggerRef = useRef<HTMLTableRowElement | null>(null)

  function openChart(holding: PortfolioHolding, row: HTMLTableRowElement) {
    triggerRef.current = row
    setActive(holding)
  }

  if (holdings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No holdings found. Import transactions to see your portfolio.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Last Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding, i) => {
            const isChartable = holding.symbol != null
            return (
              <TableRow
                key={holding.symbol ?? i}
                role={isChartable ? "button" : undefined}
                tabIndex={isChartable ? 0 : undefined}
                aria-label={
                  isChartable
                    ? `View live chart for ${holding.name ?? holding.symbol}`
                    : undefined
                }
                className={
                  isChartable ? "cursor-pointer hover:bg-muted/50" : undefined
                }
                onClick={
                  isChartable
                    ? (event) => openChart(holding, event.currentTarget)
                    : undefined
                }
                onKeyDown={
                  isChartable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          openChart(holding, event.currentTarget)
                        }
                      }
                    : undefined
                }
              >
                <TableCell className="font-medium">
                  {holding.name ?? holding.symbol}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {holding.symbol}
                </TableCell>
                <TableCell>{holding.assetClass ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatShares(holding.shares ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {holding.lastPrice != null
                    ? formatCurrency(holding.lastPrice, holding.currency ?? "")
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(
                    holding.currentValue ?? 0,
                    holding.currency ?? "",
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <HoldingChartDialog
        holding={active}
        onOpenChange={(open) => {
          if (!open) {
            setActive(null)
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      />
    </>
  )
}

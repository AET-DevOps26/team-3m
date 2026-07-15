import { ErrorBoundary } from "@/components/error-boundary"
import { InstrumentPriceView } from "@/components/markets/instrument-price-card"
import { marketDataErrorFallback } from "@/components/markets/market-data-error"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PortfolioHolding } from "@/network/endpoints/portfolio"

interface HoldingChartDialogProps {
  holding: PortfolioHolding | null
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Live price chart for a single portfolio holding, shown in a dialog opened
 * from a row in the holdings table on the portfolio overview page. Falls back
 * to a market-data error message when the holding's symbol has no market data.
 */
export function HoldingChartDialog({
  holding,
  onOpenChange,
  onCloseAutoFocus,
}: HoldingChartDialogProps) {
  const symbol = holding?.symbol

  return (
    <Dialog open={holding != null} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{holding?.name ?? symbol}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {symbol}
          </DialogDescription>
        </DialogHeader>
        {symbol ? (
          <ErrorBoundary key={symbol} renderFallback={marketDataErrorFallback}>
            <InstrumentPriceView symbol={symbol} name={holding?.name} />
          </ErrorBoundary>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No symbol available for this holding.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

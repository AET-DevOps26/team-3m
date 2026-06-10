import { ArrowLeft } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { TransactionsOverviewBlock } from "@/components/transactions/transactions-overview"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function TransactionsPage() {
  const [searchParams] = useSearchParams()
  const category = searchParams.get("category") ?? ""

  return (
    <div className="flex flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Portfolio
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-xl font-semibold">Transactions</h1>
        </div>
        <TransactionsOverviewBlock
          key={category}
          initialFilters={{ category }}
        />
      </div>
    </div>
  )
}

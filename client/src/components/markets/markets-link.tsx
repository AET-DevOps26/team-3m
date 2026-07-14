import { TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

/** Entry-point button to the markets search page, shown in the portfolio overview header. */
export function MarketsLink() {
  return (
    <Button asChild variant="outline">
      <Link to="/markets">
        <TrendingUp className="size-4" />
        Markets
      </Link>
    </Button>
  )
}

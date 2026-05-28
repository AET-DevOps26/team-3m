import { Loader2 } from "lucide-react"

export function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-svh items-center justify-center bg-background"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

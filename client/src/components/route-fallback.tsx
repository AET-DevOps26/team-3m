import { Loader2 } from "lucide-react"

interface RouteFallbackProps {
  message?: string
}

export function RouteFallback({ message }: RouteFallbackProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
    </div>
  )
}

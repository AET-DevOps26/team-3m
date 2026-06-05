import type { ReactNode } from "react"
import { AuthError } from "@/auth/auth-error"
import { useAuthGuard } from "@/auth/use-auth-guard"
import { RouteFallback } from "@/components/route-fallback"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const guard = useAuthGuard()

  if (guard.status === "authenticated") {
    return <>{children}</>
  }

  if (guard.status === "failed") {
    return <AuthError cause={guard.cause} onRetry={guard.retry} />
  }

  const message =
    guard.status === "connecting"
      ? guard.attempt > 1
        ? `Reconnecting to the sign-in service… (attempt ${guard.attempt} of ${guard.maxAttempts})`
        : "Connecting to the sign-in service…"
      : undefined

  return <RouteFallback message={message} />
}

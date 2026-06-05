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

  const message = guard.isRetrying ? "Retrying sign-in…" : "Signing you in…"

  return <RouteFallback message={message} />
}

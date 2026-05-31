import type { ReactNode } from "react"
import { useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { RouteFallback } from "@/components/route-fallback"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth()

  useEffect(() => {
    if (
      auth.isLoading ||
      auth.activeNavigator !== undefined ||
      auth.isAuthenticated
    ) {
      return
    }
    auth.signinRedirect().catch((cause) => {
      console.error("Failed to start OIDC sign-in", cause)
    })
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.activeNavigator,
    auth.signinRedirect,
  ])

  if (auth.isAuthenticated) {
    return <>{children}</>
  }

  return <RouteFallback />
}

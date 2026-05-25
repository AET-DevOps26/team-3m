import { useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { Navigate, useNavigate } from "react-router-dom"
import { RouteFallback } from "@/components/route-fallback"

/**
 * Landing route for the OIDC redirect_uri. The AuthProvider drives the
 * authorization-code exchange via its onSigninCallback hook; this route just
 * shows a loading state until `auth.isAuthenticated` flips true, then sends the
 * user home.
 */
export function AuthCallback() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (auth.error) {
      console.error("OIDC sign-in failed", auth.error)
    }
  }, [auth.error])

  if (auth.error) {
    return <Navigate to="/" replace />
  }

  if (auth.isAuthenticated) {
    void navigate("/", { replace: true })
    return <RouteFallback />
  }

  return <RouteFallback />
}

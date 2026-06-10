import { useAuth } from "react-oidc-context"
import { Navigate } from "react-router-dom"
import { AuthError } from "@/auth/auth-error"
import { RouteFallback } from "@/components/route-fallback"

/**
 * Landing route for the OIDC redirect_uri. The AuthProvider drives the
 * authorization-code exchange via its onSigninCallback hook; this route just
 * shows a loading state until `auth.isAuthenticated` flips true, then sends the
 * user home.
 */
export function AuthCallback() {
  const auth = useAuth()

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (auth.error) {
    return (
      <AuthError
        cause={auth.error}
        onRetry={() => {
          void auth.signinRedirect()
        }}
      />
    )
  }

  return <RouteFallback message="Completing sign-in…" />
}

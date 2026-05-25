import { useEffect } from "react"
import { useAuth } from "react-oidc-context"
import { setAuthTokenProvider, setSigninRedirect } from "@/network/auth-token"

/**
 * Bridges the React-side OIDC auth context to the network layer's module-level
 * token provider, so httpRequest can attach Authorization headers without
 * depending on React itself.
 */
export function AuthTokenBridge() {
  const auth = useAuth()

  useEffect(() => {
    setAuthTokenProvider(() => auth.user?.access_token ?? null)
    setSigninRedirect(() => auth.signinRedirect())
    return () => {
      setAuthTokenProvider(() => null)
      setSigninRedirect(() => {})
    }
  }, [auth.user, auth.signinRedirect])

  return null
}

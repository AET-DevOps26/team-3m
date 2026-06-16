import { WebStorageStateStore } from "oidc-client-ts"
import type { AuthProviderProps } from "react-oidc-context"

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID

if (!authority || !clientId) {
  throw new Error(
    "Missing required OIDC env vars (VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID)",
  )
}

export const authConfig: AuthProviderProps = {
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  onSigninCallback: () => {
    // Strip the OIDC `?code=…&state=…` params out of the URL once exchange completes.
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

function safeOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

export const authorityOrigin = safeOrigin(authority)

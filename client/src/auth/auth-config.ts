import { WebStorageStateStore } from "oidc-client-ts"
import type { AuthProviderProps } from "react-oidc-context"

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI
const postLogoutRedirectUri = import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI

if (!authority || !clientId) {
  throw new Error(
    "Missing required OIDC env vars (VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID)",
  )
}

export const authConfig: AuthProviderProps = {
  authority,
  client_id: clientId,
  redirect_uri: redirectUri
    ? redirectUri
    : `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: postLogoutRedirectUri
    ? postLogoutRedirectUri
    : window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  onSigninCallback: () => {
    // Strip the OIDC `?code=…&state=…` params out of the URL once exchange completes.
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

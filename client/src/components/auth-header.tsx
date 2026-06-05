import { LogOut, User } from "lucide-react"
import { useAuth } from "react-oidc-context"
import { Button } from "@/components/ui/button"

/**
 * Slim app-wide header rendered above protected routes. Shows the authenticated
 * user (preferred_username or email) and a single Logout action that triggers
 * the OIDC end-session flow.
 */
export function AuthHeader() {
  const auth = useAuth()

  if (!auth.isAuthenticated || !auth.user) {
    return null
  }

  const profile = auth.user.profile
  const displayName =
    typeof profile.preferred_username === "string" && profile.preferred_username
      ? profile.preferred_username
      : typeof profile.email === "string" && profile.email
        ? profile.email
        : "Signed in"

  return (
    <header className="flex items-center justify-end gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="size-4" />
        {displayName}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          void auth.signoutRedirect()
        }}
      >
        <LogOut className="size-4" />
        Logout
      </Button>
    </header>
  )
}

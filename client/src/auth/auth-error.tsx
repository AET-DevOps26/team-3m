import { ServerCrash } from "lucide-react"
import { authorityOrigin } from "@/auth/auth-config"
import { FullScreenError } from "@/components/full-screen-error"
import { RecoverableError, type RecoveryOption } from "@/network/errors"

interface AuthErrorProps {
  cause: unknown
  onRetry: () => void
}

function buildAuthError(cause: unknown, onRetry: () => void): RecoverableError {
  const recoveryOptions: RecoveryOption[] = [
    { label: "Try again", action: onRetry },
  ]

  if (authorityOrigin) {
    const origin = authorityOrigin
    recoveryOptions.push({
      label: "Open authentication server",
      variant: "outline",
      action: () => {
        window.open(origin, "_blank", "noopener,noreferrer")
      },
    })
  }

  return new RecoverableError({
    title: "Connection problem",
    message:
      "We couldn't reach the sign-in service after several attempts. Check your connection and try again.",
    recoveryOptions,
    presentation: {
      detail: authorityOrigin
        ? "If your preview environment uses a self-signed certificate, open the authentication server, accept it, then try again."
        : undefined,
      debugInfo: cause instanceof Error ? cause.message : undefined,
    },
  })
}

/** Boot-time auth failure screen shown when the OIDC provider can't be reached. */
export function AuthError({ cause, onRetry }: AuthErrorProps) {
  return (
    <FullScreenError
      error={buildAuthError(cause, onRetry)}
      icon={<ServerCrash className="size-10 text-muted-foreground" />}
    />
  )
}

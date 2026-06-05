import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { RecoverableError } from "@/network/errors"

interface FullScreenErrorProps {
  error: RecoverableError
  icon?: ReactNode
}

/**
 * Full-screen presentation of a RecoverableError, used for boot/route-level
 * failures where there is no surrounding UI to host a dialog or toast (the
 * RecoveryHost layer). Renders the same title → message → detail → recovery
 * options shape as RecoveryHost so error UX stays consistent across the app.
 */
export function FullScreenError({ error, icon }: FullScreenErrorProps) {
  return (
    <div
      role="alert"
      className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center"
    >
      {icon ?? <TriangleAlert className="size-10 text-muted-foreground" />}
      <div className="space-y-1">
        <h1 className="font-semibold text-foreground text-lg">
          {error.title ?? "Something went wrong"}
        </h1>
        <p className="max-w-sm text-muted-foreground text-sm">
          {error.message}
        </p>
      </div>
      {error.presentation.detail ? (
        <p className="max-w-sm text-muted-foreground text-sm">
          {error.presentation.detail}
        </p>
      ) : null}
      {error.recoveryOptions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {error.recoveryOptions.map((option) => (
            <Button
              key={option.label}
              variant={option.variant ?? "default"}
              onClick={() => void option.action()}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}
      {error.presentation.debugInfo ? (
        <p className="max-w-sm font-mono text-muted-foreground text-xs">
          {error.presentation.debugInfo}
        </p>
      ) : null}
    </div>
  )
}

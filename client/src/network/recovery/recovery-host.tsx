import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RecoverableError, type RecoveryOption } from "../errors"
import {
  publishRecoverableError,
  subscribeToRecoverableErrors,
} from "./error-recovery-broker"

const DIALOG_MIN_OPTIONS = 2

export function RecoveryHost() {
  const [current, setCurrent] = useState<RecoverableError | null>(null)
  const queueRef = useRef<RecoverableError[]>([])

  useEffect(() => {
    return subscribeToRecoverableErrors((error) => {
      if (error.recoveryOptions.length >= DIALOG_MIN_OPTIONS) {
        enqueue(error)
        return
      }
      showToast(error)
    })

    function enqueue(error: RecoverableError) {
      setCurrent((existing) => {
        if (existing) {
          queueRef.current = [...queueRef.current, error]
          return existing
        }
        return error
      })
    }
  }, [])

  function handleClose() {
    const [next, ...rest] = queueRef.current
    queueRef.current = rest
    setCurrent(next ?? null)
  }

  async function runRecovery(option: RecoveryOption) {
    try {
      await option.action()
    } catch (cause) {
      publishRecoverableError(
        RecoverableError.wrapping(cause, { title: "Recovery action failed" }),
      )
    } finally {
      handleClose()
    }
  }

  return (
    <AlertDialog
      open={current !== null}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {current?.title ?? "Something went wrong"}
          </AlertDialogTitle>
          <AlertDialogDescription>{current?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        {current?.presentation.detail && (
          <div className="text-sm text-muted-foreground">
            {current.presentation.detail}
          </div>
        )}
        <AlertDialogFooter>
          {!current?.presentation.hideCancel && (
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          )}
          {current?.recoveryOptions.map((option) => (
            <AlertDialogAction
              key={option.label}
              variant={option.variant ?? "default"}
              onClick={(event) => {
                // AlertDialogAction closes the dialog by default, which would
                // trigger handleClose via onOpenChange and advance the queue
                // before runRecovery's finally fires.
                event.preventDefault()
                void runRecovery(option)
              }}
            >
              {option.label}
            </AlertDialogAction>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function showToast(error: RecoverableError) {
  const [first] = error.recoveryOptions

  toast.error(error.title ?? "Something went wrong", {
    description: error.message,
    action: first
      ? {
          label: first.label,
          onClick: () => {
            void Promise.resolve(first.action()).catch((cause) => {
              publishRecoverableError(
                RecoverableError.wrapping(cause, {
                  title: "Recovery action failed",
                }),
              )
            })
          },
        }
      : undefined,
  })
}

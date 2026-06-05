import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "react-oidc-context"

const MAX_SIGNIN_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 1000

export type AuthGuardStatus =
  | "initializing"
  | "connecting"
  | "authenticated"
  | "failed"

export interface AuthGuardState {
  status: AuthGuardStatus
  attempt: number
  maxAttempts: number
  cause: unknown
  retry: () => void
}

export function useAuthGuard(): AuthGuardState {
  const auth = useAuth()
  const [status, setStatus] = useState<AuthGuardStatus>("initializing")
  const [attempt, setAttempt] = useState(0)
  const [cause, setCause] = useState<unknown>(null)

  const attemptsRef = useRef(0)
  const inFlightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRetryTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const attemptSignin = useCallback(() => {
    if (inFlightRef.current) {
      return
    }
    inFlightRef.current = true
    attemptsRef.current += 1
    setAttempt(attemptsRef.current)
    setStatus("connecting")

    auth.signinRedirect().catch((error: unknown) => {
      inFlightRef.current = false
      console.error(
        `OIDC sign-in attempt ${attemptsRef.current} of ${MAX_SIGNIN_ATTEMPTS} failed`,
        error,
      )

      if (attemptsRef.current >= MAX_SIGNIN_ATTEMPTS) {
        setCause(error)
        setStatus("failed")
        return
      }

      const delay = BASE_RETRY_DELAY_MS * 2 ** (attemptsRef.current - 1)
      timerRef.current = setTimeout(attemptSignin, delay)
    })
  }, [auth])

  const retry = useCallback(() => {
    clearRetryTimer()
    attemptsRef.current = 0
    inFlightRef.current = false
    setCause(null)
    attemptSignin()
  }, [attemptSignin, clearRetryTimer])

  useEffect(() => {
    if (auth.isLoading || auth.activeNavigator !== undefined) {
      return
    }
    if (auth.isAuthenticated) {
      setStatus("authenticated")
      return
    }
    if (attemptsRef.current === 0 && !inFlightRef.current) {
      attemptSignin()
    }
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.activeNavigator,
    attemptSignin,
  ])

  useEffect(() => clearRetryTimer, [clearRetryTimer])

  return { status, attempt, maxAttempts: MAX_SIGNIN_ATTEMPTS, cause, retry }
}

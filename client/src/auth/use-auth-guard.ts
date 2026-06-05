import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "react-oidc-context"

const MAX_SIGNIN_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 1000
const SIGNIN_TIMEOUT_MS = 8000

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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const attemptSignin = useCallback(() => {
    if (inFlightRef.current) {
      return
    }
    inFlightRef.current = true
    attemptsRef.current += 1
    const thisAttempt = attemptsRef.current
    setAttempt(thisAttempt)
    setStatus("connecting")

    // signinRedirect resolves only by navigating away (page unloads). If it
    // neither rejects (auth server down / bad cert) nor navigates (the request
    // hangs), the watchdog turns the stall into a failed attempt so we don't
    // sit on the spinner forever.
    const onAttemptFailed = (error: unknown) => {
      if (attemptsRef.current !== thisAttempt || !inFlightRef.current) {
        return
      }
      inFlightRef.current = false
      if (watchdogRef.current !== null) {
        clearTimeout(watchdogRef.current)
        watchdogRef.current = null
      }
      console.error(
        `OIDC sign-in attempt ${thisAttempt} of ${MAX_SIGNIN_ATTEMPTS} failed`,
        error,
      )

      if (thisAttempt >= MAX_SIGNIN_ATTEMPTS) {
        setCause(error)
        setStatus("failed")
        return
      }

      const delay = BASE_RETRY_DELAY_MS * 2 ** (thisAttempt - 1)
      retryTimerRef.current = setTimeout(attemptSignin, delay)
    }

    watchdogRef.current = setTimeout(() => {
      onAttemptFailed(
        new Error(`Sign-in did not complete within ${SIGNIN_TIMEOUT_MS}ms`),
      )
    }, SIGNIN_TIMEOUT_MS)

    auth.signinRedirect().catch(onAttemptFailed)
  }, [auth])

  const retry = useCallback(() => {
    clearTimers()
    attemptsRef.current = 0
    inFlightRef.current = false
    setCause(null)
    attemptSignin()
  }, [attemptSignin, clearTimers])

  useEffect(() => {
    if (auth.isLoading || auth.activeNavigator !== undefined) {
      return
    }
    if (auth.isAuthenticated) {
      clearTimers()
      inFlightRef.current = false
      attemptsRef.current = 0
      setAttempt(0)
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
    clearTimers,
  ])

  useEffect(() => clearTimers, [clearTimers])

  return { status, attempt, maxAttempts: MAX_SIGNIN_ATTEMPTS, cause, retry }
}

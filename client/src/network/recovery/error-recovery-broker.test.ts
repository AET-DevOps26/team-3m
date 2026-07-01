import { afterEach, describe, expect, it, vi } from "vitest"
import { RecoverableError } from "../errors"
import {
  publishRecoverableError,
  subscribeToRecoverableErrors,
} from "./error-recovery-broker"

function makeError(message = "boom"): RecoverableError {
  return new RecoverableError({ message })
}

// The broker holds a module-level set of listeners, so every subscription made
// in a test is torn down afterwards to keep tests isolated.
const cleanups: Array<() => void> = []

function subscribe(listener: (error: RecoverableError) => void): void {
  cleanups.push(subscribeToRecoverableErrors(listener))
}

describe("error recovery broker", () => {
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup()
    }
    vi.restoreAllMocks()
  })

  it("delivers a published error to a subscriber", () => {
    const listener = vi.fn()
    const error = makeError()
    subscribe(listener)

    publishRecoverableError(error)

    expect(listener).toHaveBeenCalledExactlyOnceWith(error)
  })

  it("delivers to every active subscriber", () => {
    const first = vi.fn()
    const second = vi.fn()
    subscribe(first)
    subscribe(second)

    publishRecoverableError(makeError())

    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it("stops delivering after unsubscribe", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToRecoverableErrors(listener)
    // Track it too, so a throw before the manual unsubscribe can't leak the
    // listener into later tests (afterEach delete is idempotent).
    cleanups.push(unsubscribe)

    unsubscribe()
    publishRecoverableError(makeError())

    expect(listener).not.toHaveBeenCalled()
  })

  it("isolates a throwing listener so others still receive the error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const throwing = vi.fn(() => {
      throw new Error("listener failed")
    })
    const healthy = vi.fn()
    subscribe(throwing)
    subscribe(healthy)

    expect(() => publishRecoverableError(makeError())).not.toThrow()
    expect(healthy).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalled()
  })

  it("does nothing when there are no subscribers", () => {
    expect(() => publishRecoverableError(makeError())).not.toThrow()
  })
})

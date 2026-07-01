import type { MockInstance } from "vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAuthToken,
  setAuthTokenProvider,
  setSigninRedirect,
  triggerSigninRedirect,
} from "./auth-token"

describe("auth token provider", () => {
  beforeEach(() => {
    // Reset the module-level state between tests.
    setAuthTokenProvider(() => null)
    setSigninRedirect(() => {})
  })

  it("returns null before a provider is registered", () => {
    expect(getAuthToken()).toBeNull()
  })

  it("returns the token from the registered provider", () => {
    setAuthTokenProvider(() => "token-123")
    expect(getAuthToken()).toBe("token-123")
  })

  it("uses the most recently registered provider", () => {
    setAuthTokenProvider(() => "first")
    setAuthTokenProvider(() => "second")
    expect(getAuthToken()).toBe("second")
  })
})

describe("triggerSigninRedirect", () => {
  let consoleError: MockInstance

  beforeEach(() => {
    setSigninRedirect(() => {})
    // Redirect failures are logged via console.error; silence and observe it
    // here so the two failure-path tests don't each re-spy it.
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it("invokes the registered redirect trigger", async () => {
    const trigger = vi.fn()
    setSigninRedirect(trigger)

    await triggerSigninRedirect()

    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it("deduplicates concurrent calls into a single in-flight redirect", async () => {
    const trigger = vi.fn<() => Promise<void>>(() => Promise.resolve())
    setSigninRedirect(trigger)

    const first = triggerSigninRedirect()
    const second = triggerSigninRedirect()

    expect(first).toBe(second)
    await Promise.all([first, second])
    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it("allows a new redirect after the previous one settles", async () => {
    const trigger = vi.fn()
    setSigninRedirect(trigger)

    await triggerSigninRedirect()
    await triggerSigninRedirect()

    expect(trigger).toHaveBeenCalledTimes(2)
  })

  it("swallows and logs errors thrown by the trigger", async () => {
    setSigninRedirect(() => {
      throw new Error("redirect failed")
    })

    // Must resolve rather than reject.
    await expect(triggerSigninRedirect()).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })

  it("recovers after a failed redirect and can be triggered again", async () => {
    setSigninRedirect(() => {
      throw new Error("redirect failed")
    })
    await triggerSigninRedirect()

    const trigger = vi.fn()
    setSigninRedirect(trigger)
    await triggerSigninRedirect()

    expect(trigger).toHaveBeenCalledTimes(1)
  })
})

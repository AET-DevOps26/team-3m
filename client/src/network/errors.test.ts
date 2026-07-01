import { describe, expect, it, vi } from "vitest"
import { APIError, type APIErrorCode, RecoverableError } from "./errors"

describe("APIError", () => {
  it("carries its code, status and details", () => {
    const error = new APIError({
      code: "http",
      message: "boom",
      status: 500,
      details: { reason: "server" },
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("APIError")
    expect(error.message).toBe("boom")
    expect(error.code).toBe("http")
    expect(error.status).toBe(500)
    expect(error.details).toEqual({ reason: "server" })
  })

  it("preserves the cause when provided", () => {
    const cause = new Error("root")
    const error = new APIError({ code: "network", message: "offline", cause })
    expect(error.cause).toBe(cause)
  })
})

describe("RecoverableError", () => {
  it("defaults recoveryOptions and presentation to empty", () => {
    const error = new RecoverableError({ message: "nope" })
    expect(error.name).toBe("RecoverableError")
    expect(error.recoveryOptions).toEqual([])
    expect(error.presentation).toEqual({})
  })
})

describe("RecoverableError.wrapping", () => {
  it("merges recovery options when wrapping an existing RecoverableError", () => {
    const original = new RecoverableError({
      message: "original",
      title: "Original title",
      recoveryOptions: [{ label: "Retry", action: vi.fn() }],
      presentation: { detail: "some detail" },
    })

    const wrapped = RecoverableError.wrapping(original, {
      recoveryOptions: [{ label: "Cancel", action: vi.fn() }],
    })

    expect(wrapped.message).toBe("original")
    // Falls back to the original title when no override is given.
    expect(wrapped.title).toBe("Original title")
    expect(wrapped.recoveryOptions.map((o) => o.label)).toEqual([
      "Retry",
      "Cancel",
    ])
    expect(wrapped.presentation.detail).toBe("some detail")
  })

  it("lets the fallback title override the original title", () => {
    const original = new RecoverableError({
      message: "original",
      title: "Original title",
    })
    const wrapped = RecoverableError.wrapping(original, {
      title: "Override title",
    })
    expect(wrapped.title).toBe("Override title")
  })

  it("derives a title and presentation from an APIError", () => {
    const apiError = new APIError({
      code: "validation",
      message: "bad input",
      details: { field: "amount" },
    })

    const wrapped = RecoverableError.wrapping(apiError)

    expect(wrapped.message).toBe("bad input")
    expect(wrapped.title).toBe("Invalid input")
    expect(wrapped.presentation.debugInfo).toBe("validation")
    expect(wrapped.presentation.detail).toBe('{"field":"amount"}')
  })

  it("maps each APIError code to its default title", () => {
    const cases: { code: APIErrorCode; title: string }[] = [
      { code: "network", title: "Connection problem" },
      { code: "validation", title: "Invalid input" },
      { code: "aborted", title: "Request cancelled" },
      { code: "parse", title: "Unexpected server response" },
      { code: "unauthenticated", title: "Session expired" },
      { code: "unknown", title: "Something went wrong" },
    ]

    for (const { code, title } of cases) {
      const wrapped = RecoverableError.wrapping(
        new APIError({ code, message: "x" }),
      )
      expect(wrapped.title).toBe(title)
    }
  })

  it("titles an http APIError with its status code", () => {
    const withStatus = RecoverableError.wrapping(
      new APIError({ code: "http", message: "x", status: 404 }),
    )
    expect(withStatus.title).toBe("Request failed (404)")

    const withoutStatus = RecoverableError.wrapping(
      new APIError({ code: "http", message: "x" }),
    )
    expect(withoutStatus.title).toBe("Request failed")
  })

  it("keeps a string detail from an APIError as-is", () => {
    const wrapped = RecoverableError.wrapping(
      new APIError({ code: "http", message: "x", details: "plain detail" }),
    )
    expect(wrapped.presentation.detail).toBe("plain detail")
  })

  it("omits the detail when an APIError has no details", () => {
    const wrapped = RecoverableError.wrapping(
      new APIError({ code: "network", message: "x" }),
    )
    expect(wrapped.presentation.detail).toBeUndefined()
  })

  it("uses a generic message when wrapping a plain Error", () => {
    const wrapped = RecoverableError.wrapping(new Error("kaboom"), {
      title: "Failed",
    })
    expect(wrapped.message).toBe("kaboom")
    expect(wrapped.title).toBe("Failed")
    expect(wrapped.recoveryOptions).toEqual([])
  })

  it("falls back to a generic message for non-Error values", () => {
    const wrapped = RecoverableError.wrapping("just a string")
    expect(wrapped.message).toBe("Unexpected error")
  })

  it("attaches fallback recovery options to a wrapped plain Error", () => {
    const action = vi.fn()
    const wrapped = RecoverableError.wrapping(new Error("kaboom"), {
      recoveryOptions: [{ label: "Retry", action }],
    })
    expect(wrapped.recoveryOptions).toHaveLength(1)
    expect(wrapped.recoveryOptions[0]?.label).toBe("Retry")
  })
})

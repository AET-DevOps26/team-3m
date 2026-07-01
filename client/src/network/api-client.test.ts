import { beforeEach, describe, expect, it, vi } from "vitest"

// A valid absolute base URL so openapi-fetch can build request URLs, and a
// mockable auth layer so we can assert the Bearer header and 401 redirect.
vi.mock("./config", () => ({ API_BASE_URL: "http://api.test" }))
vi.mock("./auth-token", () => ({
  getAuthToken: vi.fn<() => string | null>(() => null),
  triggerSigninRedirect: vi.fn(),
}))

import { apiClient } from "./api-client"
import { getAuthToken, triggerSigninRedirect } from "./auth-token"
import { APIError } from "./errors"

const mockGetAuthToken = vi.mocked(getAuthToken)
const mockTriggerSigninRedirect = vi.mocked(triggerSigninRedirect)

const PROFILE_PATH = "/api/v1/profile"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function stubFetch(
  impl: () => Response | Promise<Response>,
): ReturnType<typeof vi.fn> {
  const mock = vi.fn(impl)
  vi.stubGlobal("fetch", mock)
  return mock
}

/** Resolves to the error thrown by the request (fails the test if none). */
async function captureError(promise: Promise<unknown>): Promise<APIError> {
  try {
    await promise
  } catch (error) {
    return error as APIError
  }
  throw new Error("expected the request to reject")
}

// The getAuthToken mock's return value is a persistent implementation, which
// vitest's clearMocks does not reset, so default it to null before every test.
// Mock call history and stubbed globals are reset centrally (see vitest.config).
beforeEach(() => {
  mockGetAuthToken.mockReturnValue(null)
})

describe("apiClient auth header", () => {
  it("attaches a Bearer token when one is available", async () => {
    mockGetAuthToken.mockReturnValue("token-abc")
    const fetchMock = stubFetch(() => jsonResponse({ success: true }))

    await apiClient.GET(PROFILE_PATH)

    const request = fetchMock.mock.calls[0]?.[0] as Request
    expect(request.headers.get("Authorization")).toBe("Bearer token-abc")
  })

  it("omits the Authorization header when there is no token", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ success: true }))

    await apiClient.GET(PROFILE_PATH)

    const request = fetchMock.mock.calls[0]?.[0] as Request
    expect(request.headers.get("Authorization")).toBeNull()
  })
})

describe("apiClient HTTP error mapping", () => {
  it("maps a 401 to an unauthenticated error and triggers a sign-in", async () => {
    stubFetch(() => jsonResponse({ message: "expired" }, 401))

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error).toBeInstanceOf(APIError)
    expect(error.code).toBe("unauthenticated")
    expect(error.status).toBe(401)
    expect(mockTriggerSigninRedirect).toHaveBeenCalledOnce()
  })

  it("maps a 400 to a validation error", async () => {
    stubFetch(() => jsonResponse({ message: "bad request" }, 400))

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error.code).toBe("validation")
    expect(error.status).toBe(400)
    expect(error.message).toBe("bad request")
  })

  it("maps other error statuses to a generic http error", async () => {
    stubFetch(() => jsonResponse({ message: "boom" }, 500))

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error.code).toBe("http")
    expect(error.status).toBe(500)
    expect(mockTriggerSigninRedirect).not.toHaveBeenCalled()
  })
})

describe("apiClient error message extraction", () => {
  it("uses a FastAPI string detail", async () => {
    stubFetch(() => jsonResponse({ detail: "field is required" }, 400))
    const error = await captureError(apiClient.GET(PROFILE_PATH))
    expect(error.message).toBe("field is required")
  })

  it("uses the first message from a FastAPI detail array", async () => {
    stubFetch(() =>
      jsonResponse(
        { detail: [{ msg: "value too small", loc: ["body", "amount"] }] },
        400,
      ),
    )
    const error = await captureError(apiClient.GET(PROFILE_PATH))
    expect(error.message).toBe("value too small")
  })

  it("uses an 'error' field when present", async () => {
    stubFetch(() => jsonResponse({ error: "something broke" }, 400))
    const error = await captureError(apiClient.GET(PROFILE_PATH))
    expect(error.message).toBe("something broke")
  })

  it("uses a plain-text body when the response is not JSON", async () => {
    stubFetch(
      () =>
        new Response("plain failure", {
          status: 400,
          headers: { "Content-Type": "text/plain" },
        }),
    )
    const error = await captureError(apiClient.GET(PROFILE_PATH))
    expect(error.message).toBe("plain failure")
    // The raw body is preserved as details for debugging.
    expect(error.details).toBe("plain failure")
  })

  it("falls back to the HTTP status when the body has no message", async () => {
    stubFetch(() => new Response("", { status: 503 }))
    const error = await captureError(apiClient.GET(PROFILE_PATH))
    expect(error.message).toMatch(/^HTTP 503/)
  })
})

describe("apiClient transport and parse failures", () => {
  it("maps a fetch rejection to a network error", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")))

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error.code).toBe("network")
  })

  it("maps an aborted request to an aborted error", async () => {
    stubFetch(() =>
      Promise.reject(
        Object.assign(new Error("The operation was aborted"), {
          name: "AbortError",
        }),
      ),
    )

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error.code).toBe("aborted")
  })

  it("maps an unparsable success body to a parse error", async () => {
    stubFetch(
      () =>
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    )

    const error = await captureError(apiClient.GET(PROFILE_PATH))

    expect(error.code).toBe("parse")
    expect(error.details).toBe("<html>not json</html>")
  })

  it("accepts a 204 No Content response without a parse error", async () => {
    stubFetch(() => new Response(null, { status: 204 }))

    // GET always resolves to an envelope, so assert the request produced no
    // error rather than merely that it resolved.
    const { error } = await apiClient.GET(PROFILE_PATH)

    expect(error).toBeUndefined()
  })
})

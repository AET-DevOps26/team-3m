import createClient, { type Middleware } from "openapi-fetch"
import type { paths } from "./api"
import { API_BASE_URL } from "./config"
import { APIError } from "./errors"

const networkSafeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (cause) {
    const requestSignal = input instanceof Request ? input.signal : undefined
    const signal = init?.signal ?? requestSignal
    const causeName = (cause as { name?: unknown } | null)?.name
    if (signal?.aborted || causeName === "AbortError") {
      throw new APIError({
        code: "aborted",
        message: "Request cancelled",
        cause,
      })
    }
    throw new APIError({
      code: "network",
      message: "Network error — please check your connection",
      cause,
    })
  }
}

const httpErrorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return
    const text = await response.clone().text()
    const body = safeParse(text)
    throw new APIError({
      code: response.status === 400 ? "validation" : "http",
      status: response.status,
      message: extractErrorMessage(body, response),
      details: body,
    })
  },
}

const successfulJsonParseMiddleware: Middleware = {
  async onResponse({ options, request, response }) {
    if (!response.ok || options.parseAs !== "json") return
    if (response.status === 204 || request.method === "HEAD") return

    const contentLength = response.headers.get("Content-Length")
    if (
      contentLength === "0" &&
      !response.headers.get("Transfer-Encoding")?.includes("chunked")
    ) {
      return
    }

    const text = await response.clone().text()
    if (text === "") return

    try {
      JSON.parse(text)
    } catch (cause) {
      throw new APIError({
        code: "parse",
        message: "Server returned an unparsable response",
        cause,
        details: text,
      })
    }
  },
}

function safeParse(text: string): unknown {
  if (text === "") return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, response: Response): string {
  if (typeof data === "object" && data !== null) {
    const message =
      (data as { error?: unknown }).error ??
      (data as { message?: unknown }).message
    if (typeof message === "string" && message.length > 0) {
      return message
    }
  }
  if (typeof data === "string" && data.length > 0) {
    return data
  }
  return `HTTP ${response.status} ${response.statusText}`
}

export const apiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: networkSafeFetch,
})

apiClient.use(successfulJsonParseMiddleware)
apiClient.use(httpErrorMiddleware)

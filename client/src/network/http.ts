import { getAuthToken, triggerSigninRedirect } from "./auth-token"
import { API_BASE_URL } from "./config"
import { APIError } from "./errors"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface HttpRequestOptions {
  method?: HttpMethod
  path: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  parse?: "json" | "text"
}

export async function httpRequest<T>(options: HttpRequestOptions): Promise<T> {
  const {
    method = "GET",
    path,
    body,
    headers,
    signal,
    parse = "json",
  } = options

  const isJsonBody =
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)

  const mergedHeaders = new Headers(headers)
  if (isJsonBody && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json")
  }
  if (!mergedHeaders.has("Authorization")) {
    const token = getAuthToken()
    if (token !== null) {
      mergedHeaders.set("Authorization", `Bearer ${token}`)
    }
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: mergedHeaders,
      body: isJsonBody
        ? JSON.stringify(body)
        : (body as BodyInit | null | undefined),
    })
  } catch (cause) {
    if (signal?.aborted) {
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

  const rawText = await response.text()
  const data = parsePayload(rawText, parse)

  if (!response.ok) {
    if (response.status === 401) {
      triggerSigninRedirect()
      throw new APIError({
        code: "unauthenticated",
        status: 401,
        message: extractErrorMessage(data, response),
        details: data,
      })
    }
    throw new APIError({
      code: response.status === 400 ? "validation" : "http",
      status: response.status,
      message: extractErrorMessage(data, response),
      details: data,
    })
  }

  return data as T
}

function parsePayload(text: string, parse: "json" | "text"): unknown {
  if (parse === "text") {
    return text
  }
  if (text === "") {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new APIError({
      code: "parse",
      message: "Server returned an unparsable response",
      cause,
      details: text,
    })
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

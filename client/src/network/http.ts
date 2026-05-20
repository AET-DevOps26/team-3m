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

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
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
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, response: Response): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === "string" && message.length > 0) {
      return message
    }
  }
  if (typeof data === "string" && data.length > 0) {
    return data
  }
  return `HTTP ${response.status} ${response.statusText}`
}

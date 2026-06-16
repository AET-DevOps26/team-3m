import createClient, { type Middleware } from "openapi-fetch"
import { getAuthToken, triggerSigninRedirect } from "./auth-token"
import { API_BASE_URL } from "./config"
import { APIError } from "./errors"
import type {
  ApiResponsePortfolioOverview,
  ApiResponsePortfolioPerformance,
  DatabaseResponse,
  ListTransactionsApiResponse,
  ServerResponse,
} from "./generated"
import type {
  GenerateRecommendationAiAdvisorRecommendationPostData,
  GenerateRecommendationAiAdvisorRecommendationPostError,
  GenerateRecommendationAiAdvisorRecommendationPostResponse,
  ReadinessAiHealthReadinessGetResponse,
} from "./generated-ai"

interface TextResponseOperation<T = string> {
  responses: {
    200: {
      content: {
        "*/*": T
      }
    }
  }
}

interface JsonGetOperation<T> {
  responses: {
    200: {
      content: {
        "*/*": T
      }
    }
  }
}

interface JsonPostOperation<TBody, TResponse, TError = never> {
  requestBody: {
    content: {
      "application/json": TBody
    }
  }
  responses: {
    200: {
      content: {
        "application/json": TResponse
      }
    }
    422: {
      content: {
        "application/json": TError
      }
    }
  }
}

interface ApiPaths {
  "/api/v1/health/server": {
    get: TextResponseOperation<ServerResponse>
  }
  "/api/v1/health/database": {
    get: TextResponseOperation<DatabaseResponse>
  }
  "/ai/health/readiness": {
    get: TextResponseOperation<ReadinessAiHealthReadinessGetResponse>
  }
  "/ai/advisor/recommendation": {
    post: JsonPostOperation<
      GenerateRecommendationAiAdvisorRecommendationPostData["body"],
      GenerateRecommendationAiAdvisorRecommendationPostResponse,
      GenerateRecommendationAiAdvisorRecommendationPostError
    >
  }
  "/api/v1/portfolio/overview": {
    get: JsonGetOperation<ApiResponsePortfolioOverview>
  }
  "/api/v1/portfolio/performance": {
    get: JsonGetOperation<ApiResponsePortfolioPerformance>
  }
  "/api/v1/financial-transactions": {
    get: {
      parameters: {
        query?: {
          pageSize?: number
          afterDatetime?: string
          afterId?: string
        }
      }
      responses: {
        200: {
          content: {
            "application/json": ListTransactionsApiResponse
          }
        }
      }
    }
  }
}

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

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getAuthToken()
    if (token !== null) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    return request
  },
}

const httpErrorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return
    if (response.status === 401) {
      triggerSigninRedirect()
      const text = await response.clone().text()
      const body = safeParse(text)
      throw new APIError({
        code: "unauthenticated",
        status: 401,
        message: extractErrorMessage(body, response),
        details: body,
      })
    }
    const text = await response.clone().text()
    const body = safeParse(text)
    if (response.status === 401) {
      triggerSigninRedirect()
      throw new APIError({
        code: "unauthenticated",
        status: 401,
        message: extractErrorMessage(body, response),
        details: body,
      })
    }
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
    // FastAPI validation errors: { detail: string | Array<{msg, loc, ...}> }
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === "string" && detail.length > 0) return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (typeof first === "object" && first !== null) {
        const msg = (first as { msg?: unknown }).msg
        if (typeof msg === "string" && msg.length > 0) return msg
      }
    }

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

export const apiClient = createClient<ApiPaths>({
  baseUrl: API_BASE_URL,
  fetch: networkSafeFetch,
})

apiClient.use(authMiddleware)
apiClient.use(successfulJsonParseMiddleware)
apiClient.use(httpErrorMiddleware)

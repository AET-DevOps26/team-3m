import {
  keepPreviousData,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { z } from "zod"
import type { TimeRange } from "@/lib/chart-time"
import { apiClient } from "../api-client"
import { APIError } from "../errors"
import {
  instrumentHistoryApiResponseSchema,
  instrumentHistoryResultSchema,
  instrumentQuoteApiResponseSchema,
  instrumentSearchApiResponseSchema,
  pricePointSchema,
} from "../generated/zod.gen"

const SEARCH_STALE_TIME_MS = 5 * 60 * 1000
const QUOTE_STALE_TIME_MS = 60 * 1000

// z.iso.datetime() in Zod v4 only accepts Z suffix, but Java/Jackson serialises
// OffsetDateTime with +HH:MM offsets (e.g. +00:00). Use the offset-aware variant.
const datetimeWithOffset = z.string().datetime({ offset: true })

const searchEnvelopeSchema = instrumentSearchApiResponseSchema.extend({
  success: z.literal(true),
  data: z.object({
    matches: z.array(
      z.object({
        symbol: z.string(),
        name: z.string().nullish(),
        exchange: z.string().nullish(),
        type: z.string().nullish(),
        currency: z.string().nullish(),
      }),
    ),
  }),
})

const quoteEnvelopeSchema = instrumentQuoteApiResponseSchema.extend({
  success: z.literal(true),
  data: z.object({
    symbol: z.string(),
    name: z.string().nullish(),
    currency: z.string().nullish(),
    price: z.number(),
    change: z.number().nullish(),
    changePercent: z.number().nullish(),
  }),
})

const historyEnvelopeSchema = instrumentHistoryApiResponseSchema.extend({
  success: z.literal(true),
  data: instrumentHistoryResultSchema.extend({
    series: z.array(
      pricePointSchema.extend({
        timestamp: datetimeWithOffset,
        close: z.number(),
      }),
    ),
  }),
})

export type InstrumentMatch = z.infer<
  typeof searchEnvelopeSchema
>["data"]["matches"][number]
export type InstrumentQuote = z.infer<typeof quoteEnvelopeSchema>["data"]
export type InstrumentHistory = z.infer<typeof historyEnvelopeSchema>["data"]

export function useInstrumentSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ["market-data", "search", trimmed],
    enabled: trimmed.length > 0,
    staleTime: SEARCH_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<InstrumentMatch[]> => {
      const { data: raw } = await apiClient.GET("/api/v1/market-data/search", {
        params: { query: { q: trimmed } },
        signal,
      })
      const result = searchEnvelopeSchema.safeParse(raw)
      if (!result.success) {
        throw new APIError({
          code: "parse",
          message: "Unexpected response from server",
          details: raw,
        })
      }
      return result.data.data.matches
    },
  })
}

export function useInstrumentQuote(symbol: string) {
  return useSuspenseQuery<InstrumentQuote>({
    queryKey: ["market-data", "quote", symbol],
    staleTime: QUOTE_STALE_TIME_MS,
    meta: { silent: true },
    queryFn: async ({ signal }) => {
      const { data: raw } = await apiClient.GET(
        "/api/v1/market-data/quotes/{symbol}",
        { params: { path: { symbol } }, signal },
      )
      const result = quoteEnvelopeSchema.safeParse(raw)
      if (!result.success) {
        throw new APIError({
          code: "parse",
          message: "instrument quote: unexpected response from server",
          details: raw,
        })
      }
      return result.data.data
    },
  })
}

export function useInstrumentHistory(symbol: string, range: TimeRange) {
  return useSuspenseQuery<InstrumentHistory>({
    queryKey: ["market-data", "history", symbol, range],
    staleTime: QUOTE_STALE_TIME_MS,
    meta: { silent: true },
    queryFn: async ({ signal }) => {
      const { data: raw } = await apiClient.GET(
        "/api/v1/market-data/quotes/{symbol}/history",
        { params: { path: { symbol }, query: { range } }, signal },
      )
      const result = historyEnvelopeSchema.safeParse(raw)
      if (!result.success) {
        throw new APIError({
          code: "parse",
          message: "instrument history: unexpected response from server",
          details: raw,
        })
      }
      return result.data.data
    },
  })
}

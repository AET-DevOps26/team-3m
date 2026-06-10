import { useSuspenseQuery } from "@tanstack/react-query"
import { z } from "zod"
import { apiClient } from "../api-client"
import { APIError } from "../errors"
import type {
  PortfolioHolding,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioSnapshot,
} from "../generated/types.gen"
import {
  apiResponsePortfolioOverviewSchema,
  apiResponsePortfolioPerformanceSchema,
  portfolioPerformanceSchema,
  portfolioSnapshotSchema,
} from "../generated/zod.gen"

// z.iso.datetime() in Zod v4 only accepts Z suffix, but Java/Jackson serialises
// OffsetDateTime with +HH:MM offsets (e.g. +00:00). Use the offset-aware variant.
const datetimeWithOffset = z.string().datetime({ offset: true })

const portfolioPerformanceWithOffsetSchema =
  apiResponsePortfolioPerformanceSchema.extend({
    data: portfolioPerformanceSchema
      .extend({
        snapshots: z
          .array(
            portfolioSnapshotSchema.extend({
              datetime: datetimeWithOffset.optional(),
            }),
          )
          .optional(),
      })
      .optional(),
  })

export type {
  PortfolioHolding,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioSnapshot,
}

export const OVERVIEW_QUERY_KEY = ["portfolio", "overview"] as const
export const PERFORMANCE_QUERY_KEY = ["portfolio", "performance"] as const

export function usePortfolioOverview() {
  return useSuspenseQuery<PortfolioOverview>({
    queryKey: OVERVIEW_QUERY_KEY,
    meta: { silent: true },
    queryFn: async ({ signal }) => {
      const { data: raw } = await apiClient.GET("/api/v1/portfolio/overview", {
        signal,
      })
      const envelope = apiResponsePortfolioOverviewSchema.parse(raw)
      if (!envelope.data)
        throw new APIError({
          code: "parse",
          message: "portfolio overview: missing data in response",
        })
      return envelope.data
    },
  })
}

export function usePortfolioPerformance() {
  return useSuspenseQuery<PortfolioPerformance>({
    queryKey: PERFORMANCE_QUERY_KEY,
    meta: { silent: true },
    queryFn: async ({ signal }) => {
      const { data: raw } = await apiClient.GET(
        "/api/v1/portfolio/performance",
        { signal },
      )
      const envelope = portfolioPerformanceWithOffsetSchema.parse(raw)
      if (!envelope.data)
        throw new APIError({
          code: "parse",
          message: "portfolio performance: missing data in response",
        })
      return envelope.data
    },
  })
}

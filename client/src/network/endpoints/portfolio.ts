import { useSuspenseQuery } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import type {
  PortfolioHolding,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioSnapshot,
} from "../generated/types.gen"
import {
  apiResponsePortfolioOverviewSchema,
  apiResponsePortfolioPerformanceSchema,
} from "../generated/zod.gen"

export type {
  PortfolioHolding,
  PortfolioOverview,
  PortfolioPerformance,
  PortfolioSnapshot,
}

const OVERVIEW_QUERY_KEY = ["portfolio", "overview"] as const
const PERFORMANCE_QUERY_KEY = ["portfolio", "performance"] as const

export function usePortfolioOverview() {
  return useSuspenseQuery<PortfolioOverview>({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const { data: raw } = await apiClient.GET(
        "/api/v1/portfolio/overview",
        {},
      )
      const envelope = apiResponsePortfolioOverviewSchema.parse(raw)
      if (!envelope.data)
        throw new Error("portfolio overview: missing data in response")
      return envelope.data
    },
  })
}

export function usePortfolioPerformance() {
  return useSuspenseQuery<PortfolioPerformance>({
    queryKey: PERFORMANCE_QUERY_KEY,
    queryFn: async () => {
      const { data: raw } = await apiClient.GET(
        "/api/v1/portfolio/performance",
        {},
      )
      const envelope = apiResponsePortfolioPerformanceSchema.parse(raw)
      if (!envelope.data)
        throw new Error("portfolio performance: missing data in response")
      return envelope.data
    },
  })
}

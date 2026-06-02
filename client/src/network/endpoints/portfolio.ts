import { useSuspenseQuery } from "@tanstack/react-query"
import { z } from "zod"
import { httpRequest } from "../http"

const OVERVIEW_PATH = "/api/v1/portfolio/overview"
const PERFORMANCE_PATH = "/api/v1/portfolio/performance"
const OVERVIEW_QUERY_KEY = ["portfolio", "overview"] as const
const PERFORMANCE_QUERY_KEY = ["portfolio", "performance"] as const

const portfolioHoldingSchema = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  assetClass: z.string().nullable(),
  currency: z.string(),
  shares: z.number(),
  lastPrice: z.number().nullable(),
  currentValue: z.number(),
})

const portfolioOverviewSchema = z.object({
  holdings: z.array(portfolioHoldingSchema),
  cashBalance: z.number(),
  currency: z.string(),
  totalValue: z.number(),
})

const portfolioOverviewEnvelopeSchema = z.object({
  success: z.literal(true),
  data: portfolioOverviewSchema,
})

export type PortfolioHolding = z.infer<typeof portfolioHoldingSchema>
export type PortfolioOverview = z.infer<typeof portfolioOverviewSchema>

const portfolioSnapshotSchema = z.object({
  date: z.string(),
  value: z.number(),
})

const portfolioPerformanceSchema = z.object({
  snapshots: z.array(portfolioSnapshotSchema),
  currency: z.string(),
})

const portfolioPerformanceEnvelopeSchema = z.object({
  success: z.literal(true),
  data: portfolioPerformanceSchema,
})

export type PortfolioSnapshot = z.infer<typeof portfolioSnapshotSchema>
export type PortfolioPerformance = z.infer<typeof portfolioPerformanceSchema>

export function usePortfolioOverview() {
  return useSuspenseQuery<PortfolioOverview>({
    queryKey: OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const raw = await httpRequest<unknown>({
        method: "GET",
        path: OVERVIEW_PATH,
      })
      return portfolioOverviewEnvelopeSchema.parse(raw).data
    },
  })
}

export function usePortfolioPerformance() {
  return useSuspenseQuery<PortfolioPerformance>({
    queryKey: PERFORMANCE_QUERY_KEY,
    queryFn: async () => {
      const raw = await httpRequest<unknown>({
        method: "GET",
        path: PERFORMANCE_PATH,
      })
      return portfolioPerformanceEnvelopeSchema.parse(raw).data
    },
  })
}

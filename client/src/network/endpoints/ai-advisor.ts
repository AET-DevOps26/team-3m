import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "../api-client"
import { APIError } from "../errors"
import type {
  PortfolioHolding,
  PortfolioOverview,
} from "../generated/types.gen"
import type {
  PortfolioHoldingInput,
  PortfolioInput,
  RecommendationResponse,
} from "../generated-ai/types.gen"
import type { RiskTolerance } from "./profile"

export type { RecommendationResponse }

interface GenerateRecommendationParams {
  overview: PortfolioOverview
  riskTolerance: RiskTolerance | null | undefined
}

function isHoldingUsable(h: PortfolioHolding): h is PortfolioHolding & {
  symbol: string
  name: string
  shares: number
  currentValue: number
} {
  return (
    typeof h.symbol === "string" &&
    h.symbol.trim().length > 0 &&
    typeof h.name === "string" &&
    h.name.trim().length > 0 &&
    typeof h.shares === "number" &&
    Number.isFinite(h.shares) &&
    typeof h.currentValue === "number" &&
    Number.isFinite(h.currentValue)
  )
}

function toHoldingInput(
  h: PortfolioHolding & {
    symbol: string
    name: string
    shares: number
    currentValue: number
  },
  fallbackCurrency: string,
): PortfolioHoldingInput {
  return {
    symbol: h.symbol,
    name: h.name,
    asset_class: h.assetClass ?? "",
    shares: h.shares,
    current_value: h.currentValue,
    currency: h.currency ?? fallbackCurrency,
  }
}

function toPortfolioInput(
  overview: PortfolioOverview,
  riskTolerance: RiskTolerance | null | undefined,
): PortfolioInput {
  const currency = overview.currency ?? ""
  return {
    holdings: (overview.holdings ?? [])
      .filter(isHoldingUsable)
      .map((h) => toHoldingInput(h, currency)),
    cash_balance: overview.cashBalance ?? 0,
    total_value: overview.totalValue ?? 0,
    currency,
    risk_tolerance: riskTolerance ?? null,
  }
}

export const LATEST_RECOMMENDATION_QUERY_KEY = [
  "ai",
  "recommendation",
  "latest",
] as const

export function useLatestRecommendation() {
  return useQuery<RecommendationResponse | null, APIError>({
    queryKey: LATEST_RECOMMENDATION_QUERY_KEY,
    queryFn: async () => {
      try {
        const { data } = await apiClient.GET("/ai/advisor/recommendation")
        return data ?? null
      } catch (error) {
        if (error instanceof APIError && error.status === 404) {
          return null
        }
        throw error
      }
    },
  })
}

export function useGenerateRecommendation() {
  const queryClient = useQueryClient()
  return useMutation<
    RecommendationResponse,
    APIError,
    GenerateRecommendationParams
  >({
    mutationFn: async ({ overview, riskTolerance }) => {
      const { data } = await apiClient.POST("/ai/advisor/recommendation", {
        body: toPortfolioInput(overview, riskTolerance),
      })
      if (!data) {
        throw new APIError({
          code: "parse",
          message: "AI service returned an empty recommendation",
        })
      }
      return data
    },
    onSuccess: async (data) => {
      await queryClient.cancelQueries({
        queryKey: LATEST_RECOMMENDATION_QUERY_KEY,
      })
      queryClient.setQueryData(LATEST_RECOMMENDATION_QUERY_KEY, data)
    },
  })
}

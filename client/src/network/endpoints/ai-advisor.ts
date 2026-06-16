import { useMutation } from "@tanstack/react-query"
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

export type { RecommendationResponse }

function isHoldingUsable(h: PortfolioHolding): h is PortfolioHolding & {
  symbol: string
  name: string
  shares: number
  currentValue: number
} {
  return !!(h.symbol && h.name && h.shares && h.currentValue)
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

function toPortfolioInput(overview: PortfolioOverview): PortfolioInput {
  const currency = overview.currency ?? ""
  return {
    holdings: (overview.holdings ?? [])
      .filter(isHoldingUsable)
      .map((h) => toHoldingInput(h, currency)),
    cash_balance: overview.cashBalance ?? 0,
    total_value: overview.totalValue ?? 0,
    currency,
  }
}

export function useGenerateRecommendation() {
  return useMutation<RecommendationResponse, APIError, PortfolioOverview>({
    mutationFn: async (overview) => {
      const { data } = await apiClient.POST("/ai/advisor/recommendation", {
        body: toPortfolioInput(overview),
      })
      if (!data) {
        throw new APIError({
          code: "parse",
          message: "AI service returned an empty recommendation",
        })
      }
      return data
    },
  })
}

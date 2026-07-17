import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { RecommendationResponse } from "@/network/endpoints/ai-advisor"
import type { PortfolioOverview } from "@/network/endpoints/portfolio"

const mocks = vi.hoisted(() => ({
  stored: null as RecommendationResponse | null,
}))

vi.mock("@/network/endpoints/ai-advisor", () => ({
  useLatestRecommendation: () => ({
    data: mocks.stored,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGenerateRecommendation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock("@/network/endpoints/profile", () => ({
  useProfile: () => ({ data: { riskTolerance: "moderate" } }),
}))

import { PortfolioRecommendation } from "./portfolio-recommendation"

const baseRecommendation: RecommendationResponse = {
  recommendation: "Stay diversified.",
  rationale: "Your allocation is balanced.",
  disclaimer: "Not financial advice.",
}

const overview = {} as PortfolioOverview

describe("PortfolioRecommendation news section", () => {
  it("renders references as links even when the summary is empty", () => {
    mocks.stored = {
      ...baseRecommendation,
      news_summary: undefined,
      news_references: [
        {
          title: "AAPL rallies",
          url: "https://news.test/aapl",
          source: "Reuters",
        },
      ],
    }

    render(<PortfolioRecommendation overview={overview} />)

    expect(screen.getByText("In the news")).toBeTruthy()
    const link = screen.getByRole("link", { name: "AAPL rallies" })
    expect(link.getAttribute("href")).toBe("https://news.test/aapl")
  })

  it("omits the news section when there is no summary and no references", () => {
    mocks.stored = {
      ...baseRecommendation,
      news_summary: undefined,
      news_references: [],
    }

    render(<PortfolioRecommendation overview={overview} />)

    expect(screen.queryByText("In the news")).toBeNull()
  })
})

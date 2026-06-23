import { expect, test } from "@playwright/test"
import { fulfillOk, overview, SAMPLE_HOLDINGS } from "./stubs"

const OVERVIEW_ROUTE = /\/api\/v1\/portfolio\/overview/

test("renders holdings and summary values from portfolio data", async ({
  page,
}) => {
  await page.route(OVERVIEW_ROUTE, async (route) => {
    await fulfillOk(route, overview())
  })

  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()

  // Summary cards: total = investments (3577.68 + 4160) + cash (1500).
  await expect(page.getByText("€9,237.68")).toBeVisible()
  await expect(page.getByText("€1,500.00")).toBeVisible()

  // Holdings table is populated rather than showing the empty state.
  await expect(page.getByText("No holdings found.")).toHaveCount(0)
  const table = page.getByRole("table")
  await expect(table.getByText("Apple")).toBeVisible()
  await expect(table.getByText("iShares Core S&P 500 UCITS ETF")).toBeVisible()
  await expect(table.getByText(SAMPLE_HOLDINGS[0].symbol)).toBeVisible()
  await expect(table.getByText("€3,577.68")).toBeVisible()
})

test("shows an error state when portfolio data fails to load", async ({
  page,
}) => {
  await page.route(OVERVIEW_ROUTE, async (route) => {
    await route.fulfill({
      status: 500,
      json: { success: false, error: "Server error", details: null },
    })
  })

  await page.goto("/")

  await expect(page.getByText(/Failed to load portfolio data/)).toBeVisible()
})

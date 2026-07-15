import { expect, test } from "@playwright/test"
import { primeSession } from "./session"
import {
  fulfillOk,
  instrumentHistory,
  instrumentQuote,
  instrumentSearch,
} from "./stubs"

const SEARCH_ROUTE = /\/api\/v1\/market-data\/search/
const QUOTE_ROUTE = /\/api\/v1\/market-data\/quotes\/[^/]+$/
const HISTORY_ROUTE = /\/api\/v1\/market-data\/quotes\/[^/]+\/history/

test("searches for an instrument and opens its live price detail", async ({
  page,
}) => {
  await page.route(SEARCH_ROUTE, async (route) => {
    await fulfillOk(route, instrumentSearch())
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await fulfillOk(route, instrumentHistory())
  })
  await page.route(QUOTE_ROUTE, async (route) => {
    await fulfillOk(route, instrumentQuote())
  })

  await primeSession(page)
  await page.getByRole("link", { name: "Markets" }).click()
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible()

  await page.getByPlaceholder("Search by ticker or company name…").fill("apple")
  const result = page.getByRole("link", { name: /Apple Inc\./ })
  await expect(result).toBeVisible()

  await result.click()
  await expect(page).toHaveURL(/\/markets\/AAPL$/)
  await expect(page.getByText("$308.24")).toBeVisible()
  await expect(page.getByText("+$13.86 (+4.71%)")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "MAX", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
})

test("switches the price chart time range and refetches", async ({ page }) => {
  const requestedRanges: string[] = []
  await page.route(HISTORY_ROUTE, async (route) => {
    const range =
      new URL(route.request().url()).searchParams.get("range") ?? "1M"
    requestedRanges.push(range)
    await fulfillOk(route, instrumentHistory(range))
  })
  await page.route(QUOTE_ROUTE, async (route) => {
    await fulfillOk(route, instrumentQuote())
  })

  await primeSession(page)
  await page.goto("/markets/AAPL")
  await expect(page.getByText("$308.24")).toBeVisible()

  const oneYear = page.getByRole("button", { name: "1Y", exact: true })
  await oneYear.click()

  await expect(oneYear).toHaveAttribute("aria-pressed", "true")
  await expect.poll(() => requestedRanges).toContain("1Y")
})

test("shows the upstream error message when market data is unavailable", async ({
  page,
}) => {
  const errorBody = {
    success: false,
    data: null,
    error:
      "Live market data is temporarily unavailable. Please try again later.",
    details: null,
  }
  await page.route(QUOTE_ROUTE, async (route) => {
    await route.fulfill({ status: 502, json: errorBody })
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await route.fulfill({ status: 502, json: errorBody })
  })

  await primeSession(page)
  await page.goto("/markets/AAPL")

  await expect(page.getByText("Could not load market data")).toBeVisible()
  await expect(
    page.getByText(
      "Live market data is temporarily unavailable. Please try again later.",
    ),
  ).toBeVisible()
})

test("shows a not-found message for an unknown symbol", async ({ page }) => {
  const errorBody = {
    success: false,
    data: null,
    error: "No instrument found for symbol 'NOPE'",
    details: null,
  }
  await page.route(QUOTE_ROUTE, async (route) => {
    await route.fulfill({ status: 404, json: errorBody })
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await route.fulfill({ status: 404, json: errorBody })
  })

  await primeSession(page)
  await page.goto("/markets/NOPE")

  await expect(page.getByText("Could not load market data")).toBeVisible()
  await expect(
    page.getByText("No instrument found for symbol 'NOPE'"),
  ).toBeVisible()
})

test("shows an empty state when no instruments match", async ({ page }) => {
  await page.route(SEARCH_ROUTE, async (route) => {
    await fulfillOk(route, instrumentSearch([]))
  })

  await primeSession(page)
  await page.goto("/markets")

  await page.getByPlaceholder("Search by ticker or company name…").fill("zzzz")
  await expect(page.getByText("No instruments found for “zzzz”.")).toBeVisible()
})

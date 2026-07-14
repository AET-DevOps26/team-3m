import { expect, test } from "@playwright/test"
import {
  fulfillOk,
  instrumentHistory,
  instrumentQuote,
  overview,
  performance,
} from "./stubs"

const OVERVIEW_ROUTE = /\/api\/v1\/portfolio\/overview/
const PERFORMANCE_ROUTE = /\/api\/v1\/portfolio\/performance/
const QUOTE_ROUTE = /\/api\/v1\/market-data\/quotes\/[^/]+$/
const HISTORY_ROUTE = /\/api\/v1\/market-data\/quotes\/[^/]+\/history/

const APPLE_ROW = /View live chart for Apple/

async function stubPortfolio(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route(OVERVIEW_ROUTE, async (route) => {
    await fulfillOk(route, overview())
  })
  await page.route(PERFORMANCE_ROUTE, async (route) => {
    await fulfillOk(route, performance())
  })
}

test("opens a holding's live price chart in a dialog", async ({ page }) => {
  await stubPortfolio(page)
  await page.route(QUOTE_ROUTE, async (route) => {
    await fulfillOk(route, instrumentQuote())
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await fulfillOk(route, instrumentHistory())
  })

  await page.goto("/")
  await page.getByRole("button", { name: APPLE_ROW }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("$308.24")).toBeVisible()
  await expect(dialog.getByText("+$13.86 (+4.71%)")).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "MAX", exact: true }),
  ).toHaveAttribute("aria-pressed", "true")
})

test("opens the chart via keyboard and restores focus on close", async ({
  page,
}) => {
  await stubPortfolio(page)
  await page.route(QUOTE_ROUTE, async (route) => {
    await fulfillOk(route, instrumentQuote())
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await fulfillOk(route, instrumentHistory())
  })

  await page.goto("/")
  const row = page.getByRole("button", { name: APPLE_ROW })
  await row.focus()
  await page.keyboard.press("Enter")

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(row).toBeFocused()
})

test("switches the chart time range inside the dialog and refetches", async ({
  page,
}) => {
  await stubPortfolio(page)
  const requestedRanges: string[] = []
  await page.route(QUOTE_ROUTE, async (route) => {
    await fulfillOk(route, instrumentQuote())
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    const range =
      new URL(route.request().url()).searchParams.get("range") ?? "1M"
    requestedRanges.push(range)
    await fulfillOk(route, instrumentHistory(range))
  })

  await page.goto("/")
  await page.getByRole("button", { name: APPLE_ROW }).click()

  const dialog = page.getByRole("dialog")
  const oneYear = dialog.getByRole("button", { name: "1Y", exact: true })
  await oneYear.click()

  await expect(oneYear).toHaveAttribute("aria-pressed", "true")
  await expect.poll(() => requestedRanges).toContain("1Y")
})

test("shows the market-data error fallback for an unresolvable holding", async ({
  page,
}) => {
  await stubPortfolio(page)
  const errorBody = {
    success: false,
    data: null,
    error: "No instrument found for symbol 'US0378331005'",
    details: null,
  }
  await page.route(QUOTE_ROUTE, async (route) => {
    await route.fulfill({ status: 404, json: errorBody })
  })
  await page.route(HISTORY_ROUTE, async (route) => {
    await route.fulfill({ status: 404, json: errorBody })
  })

  await page.goto("/")
  await page.getByRole("button", { name: APPLE_ROW }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Could not load market data")).toBeVisible()
  await expect(
    dialog.getByText("No instrument found for symbol 'US0378331005'"),
  ).toBeVisible()
})

import { expect, test } from "@playwright/test"
import { primeSession } from "./session"
import {
  envelope,
  transaction,
  transactionMetadata,
  transactionsPage,
} from "./stubs"

const METADATA_ROUTE = /\/api\/v1\/financial-transactions\/metadata/
const LIST_ROUTE = /\/api\/v1\/financial-transactions\?/

test.beforeEach(async ({ page }) => {
  await page.route(METADATA_ROUTE, async (route) => {
    await route.fulfill({ json: envelope(transactionMetadata()) })
  })
})

test("renders a populated transaction list", async ({ page }) => {
  await page.route(LIST_ROUTE, async (route) => {
    await route.fulfill({
      json: envelope(
        transactionsPage([
          transaction({ name: "Apple", category: "TRADING", amount: -1885 }),
          transaction({
            name: "Monthly salary",
            category: "CASH",
            type: "CUSTOMER_INBOUND",
            amount: 3200,
          }),
        ]),
      ),
    })
  })

  await primeSession(page)
  await page.goto("/transactions")

  await expect(page.getByText("Apple")).toBeVisible()
  await expect(page.getByText("Monthly salary")).toBeVisible()
})

test("filters transactions by category server-side", async ({ page }) => {
  await page.route(LIST_ROUTE, async (route) => {
    await route.fulfill({
      json: envelope(
        transactionsPage([
          transaction({ name: "Apple", category: "TRADING", amount: -1885 }),
        ]),
      ),
    })
  })

  await primeSession(page)

  const listRequest = page.waitForRequest(LIST_ROUTE)
  await page.goto("/transactions?category=TRADING")

  // The category filter is sent to the server, not applied client-side.
  const url = new URL((await listRequest).url())
  expect(url.searchParams.get("category")).toBe("TRADING")

  await expect(page.getByText("Apple")).toBeVisible()
})

test("shows an empty state when no transactions match the filter", async ({
  page,
}) => {
  await page.route(LIST_ROUTE, async (route) => {
    await route.fulfill({ json: envelope(transactionsPage([])) })
  })

  await primeSession(page)
  await page.goto("/transactions?category=CASH")

  await expect(
    page.getByText("No transactions match your filters."),
  ).toBeVisible()
})

test("shows an error when transactions fail to load", async ({ page }) => {
  await page.route(LIST_ROUTE, async (route) => {
    await route.fulfill({
      status: 500,
      json: { success: false, error: "Server error", details: null },
    })
  })

  await primeSession(page)
  await page.goto("/transactions?category=TRADING")

  await expect(page.getByText("Failed to load transactions")).toBeVisible()
})

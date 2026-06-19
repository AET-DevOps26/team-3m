import { expect, test } from "@playwright/test"
import { envelope, performance } from "./stubs"

const PERFORMANCE_ROUTE = /\/api\/v1\/portfolio\/performance/
const EMPTY_MESSAGE = "Import more transactions to see performance over time."

test("shows an empty state when there is no performance history", async ({
  page,
}) => {
  await page.route(PERFORMANCE_ROUTE, async (route) => {
    await route.fulfill({ json: envelope({ snapshots: [], currency: "EUR" }) })
  })

  await page.goto("/")

  await expect(page.getByText("Performance", { exact: true })).toBeVisible()
  await expect(page.getByText(EMPTY_MESSAGE)).toBeVisible()
})

test("renders the chart and switches time ranges", async ({ page }) => {
  await page.route(PERFORMANCE_ROUTE, async (route) => {
    await route.fulfill({ json: envelope(performance()) })
  })

  await page.goto("/")
  await expect(page.getByText("Performance", { exact: true })).toBeVisible()

  // With history present, the empty state is gone and the chart branch renders.
  await expect(page.getByText(EMPTY_MESSAGE)).toHaveCount(0)

  // MAX is the default selected range; switching updates the active range.
  const max = page.getByRole("button", { name: "MAX", exact: true })
  const oneYear = page.getByRole("button", { name: "1Y", exact: true })
  await expect(max).toHaveClass(/bg-primary/)

  await oneYear.click()
  await expect(oneYear).toHaveClass(/bg-primary/)
  await expect(max).not.toHaveClass(/bg-primary/)
})

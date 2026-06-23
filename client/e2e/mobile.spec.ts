import { expect, test } from "@playwright/test"
import { fulfillOk, overview } from "./stubs"

// A typical mobile portrait viewport (e.g. iPhone 12/13).
test.use({ viewport: { width: 390, height: 844 } })

test("portfolio overview is usable on a mobile viewport", async ({ page }) => {
  await page.route(/\/api\/v1\/portfolio\/overview/, async (route) => {
    await fulfillOk(route, overview())
  })

  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Import CSV" })).toBeVisible()
  await expect(page.getByText("Total Portfolio")).toBeVisible()
  await expect(page.getByRole("table").getByText("Apple")).toBeVisible()
})

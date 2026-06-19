import { expect, test } from "@playwright/test"
import { recommendation } from "./stubs"

const RECOMMENDATION_ROUTE = /\/ai\/advisor\/recommendation/

test("generates and renders an AI recommendation", async ({ page }) => {
  await page.route(RECOMMENDATION_ROUTE, async (route) => {
    await route.fulfill({ json: recommendation() })
  })

  await page.goto("/")
  await expect(page.getByText("AI Recommendation")).toBeVisible()

  await page.getByRole("button", { name: "Generate" }).click()

  const stub = recommendation()
  await expect(page.getByText(stub.recommendation)).toBeVisible()
  await expect(page.getByText(stub.rationale)).toBeVisible()
  await expect(page.getByText(stub.disclaimer)).toBeVisible()
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible()
})

test("shows an error when recommendation generation fails", async ({
  page,
}) => {
  await page.route(RECOMMENDATION_ROUTE, async (route) => {
    await route.fulfill({
      status: 500,
      json: { detail: "AI service unavailable" },
    })
  })

  await page.goto("/")
  await page.getByRole("button", { name: "Generate" }).click()

  await expect(page.getByText("Click Generate to try again.")).toBeVisible()
})

import { expect, test } from "@playwright/test"
import { primeSession } from "./session"

test.beforeEach(async ({ page }) => {
  await primeSession(page)
})

test("shows page heading and back button", async ({ page }) => {
  await page.goto("/transactions")

  await expect(
    page.getByRole("heading", { name: "Transactions" }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: /Portfolio/ })).toBeVisible()
})

test("back button navigates to portfolio", async ({ page }) => {
  await page.goto("/transactions")

  await page.getByRole("link", { name: /Portfolio/ }).click()

  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()
})

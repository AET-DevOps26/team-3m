import { expect, test } from "@playwright/test"

test("shows page heading and summary cards", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()
  await expect(page.getByText("Total Portfolio")).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText("Investments")).toBeVisible()
  await expect(page.getByText("Cash")).toBeVisible()
})

test("shows Holdings section", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("Holdings", { exact: true })).toBeVisible({
    timeout: 15_000,
  })
})

test("clicking Total Portfolio navigates to transactions", async ({ page }) => {
  await page.goto("/")

  await page.getByText("Total Portfolio").click({ timeout: 15_000 })

  await expect(page).toHaveURL("/transactions")
  await expect(
    page.getByRole("heading", { name: "Transactions" }),
  ).toBeVisible()
})

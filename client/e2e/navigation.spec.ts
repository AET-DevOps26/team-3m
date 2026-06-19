import { expect, test } from "@playwright/test"
import { primeSession } from "./session"

test("header shows Kontor brand when authenticated", async ({ page }) => {
  await page.goto("/")

  await expect(page.locator("header").getByText("Kontor")).toBeVisible()
})

test("footer About link navigates to about page", async ({ page }) => {
  await page.goto("/")

  await page
    .getByRole("navigation")
    .getByRole("link", { name: "About" })
    .click()

  await expect(page).toHaveURL("/about")
  await expect(page.getByRole("heading", { name: "Kontor" })).toBeVisible()
})

test("about page lists all team members", async ({ page }) => {
  await primeSession(page)
  await page.goto("/about")

  await expect(page.getByRole("link", { name: /Mathilde/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Magnus/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /Maximilian/ })).toBeVisible()
})

test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("redirects to Keycloak login", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL(/.*\/realms\/kontor.*/, { timeout: 15_000 })
  })
})

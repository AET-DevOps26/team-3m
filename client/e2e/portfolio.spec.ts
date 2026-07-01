import { expect, test } from "@playwright/test"

// Summary cards and holdings are fetched from the live backend, so allow
// generous time for the first paint of data-dependent content.
const DATA_LOAD_TIMEOUT_MS = 15_000

test("shows page heading and summary cards", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()
  await expect(page.getByText("Total Portfolio")).toBeVisible({
    timeout: DATA_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByText("Investments")).toBeVisible()
  await expect(page.getByText("Cash")).toBeVisible()
})

test("shows Holdings section", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("Holdings", { exact: true })).toBeVisible({
    timeout: DATA_LOAD_TIMEOUT_MS,
  })
})

test("clicking Total Portfolio navigates to transactions", async ({ page }) => {
  await page.goto("/")

  await page
    .getByText("Total Portfolio")
    .click({ timeout: DATA_LOAD_TIMEOUT_MS })

  // The click only resolves once navigation starts; the route change and first
  // paint of the Transactions page can still exceed the local 5s expect default
  // on a cold backend, so give these the same generous window as the click.
  await expect(page).toHaveURL("/transactions", {
    timeout: DATA_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible(
    { timeout: DATA_LOAD_TIMEOUT_MS },
  )
})

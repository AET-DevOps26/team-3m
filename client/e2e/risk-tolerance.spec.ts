import { expect, test } from "@playwright/test"
import { completeRiskToleranceIfPresent } from "./onboarding"
import { fulfillOk, profile } from "./stubs"

test("prompts a first-time user to set their risk tolerance", async ({
  page,
}) => {
  await page.route("**/api/v1/profile", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillOk(route, profile(null))
      return
    }
    await route.continue()
  })

  await page.goto("/")

  await expect(
    page.getByRole("alertdialog").getByText("Set your risk tolerance"),
  ).toBeVisible()
})

test("saving a risk tolerance dismisses the dialog", async ({ page }) => {
  let saved = false
  await page.route("**/api/v1/profile", async (route) => {
    if (route.request().method() === "PUT") {
      saved = true
      await fulfillOk(route, profile("MODERATE"))
      return
    }
    await fulfillOk(route, profile(saved ? "MODERATE" : null))
  })

  await page.goto("/")
  await completeRiskToleranceIfPresent(page)

  expect(saved).toBe(true)
})

test("does not prompt a user who already set their risk tolerance", async ({
  page,
}) => {
  await page.route("**/api/v1/profile", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillOk(route, profile("AGGRESSIVE"))
      return
    }
    await route.continue()
  })

  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Portfolio Overview" }),
  ).toBeVisible()
  await expect(page.getByRole("alertdialog")).toBeHidden()
})

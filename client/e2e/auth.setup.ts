import { mkdirSync } from "node:fs"
import { test as setup } from "@playwright/test"
import { completeRiskToleranceIfPresent } from "./onboarding"

const AUTH_FILE = "e2e/.auth/user.json"

setup("authenticate as dev user", async ({ page }) => {
  mkdirSync("e2e/.auth", { recursive: true })

  await page.goto("/")
  await page.waitForURL(
    /.*\/realms\/kontor\/protocol\/openid-connect\/auth.*/,
    {
      timeout: 15_000,
    },
  )

  await page.getByRole("textbox", { name: "Username or email" }).fill("dev")
  await page.getByRole("textbox", { name: "Password" }).fill("dev")
  await page.getByRole("button", { name: "Sign In" }).click()

  await page.waitForURL("/", { timeout: 30_000 })

  // A freshly provisioned user (e.g. CI's empty database) lands on a blocking
  // risk-tolerance dialog that aria-hides the page. Clear it so the saved
  // session is fully onboarded and later tests can interact with the page.
  await completeRiskToleranceIfPresent(page)
  await page.getByRole("heading", { name: "Portfolio Overview" }).waitFor()

  await page.context().storageState({ path: AUTH_FILE })
})

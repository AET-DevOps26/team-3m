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

  // A freshly provisioned user lands on a blocking risk-tolerance dialog that
  // aria-hides the page. Wait for either that dialog or the portfolio heading,
  // then clear the dialog so the saved session is fully onboarded.
  const heading = page.getByRole("heading", { name: "Portfolio Overview" })
  await Promise.race([
    heading.waitFor(),
    page.getByRole("alertdialog").waitFor(),
  ])
  await completeRiskToleranceIfPresent(page)
  await heading.waitFor()

  await page.context().storageState({ path: AUTH_FILE })
})

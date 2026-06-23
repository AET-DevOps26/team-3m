import { expect, test } from "@playwright/test"

// A valid RFC-4122 v4 UUID — the client validates profile ids with z.uuid(),
// so stubbed responses must use a well-formed id.
const DEV_USER_ID = "00000000-0000-4000-8000-000000000000"

interface ProfileEnvelope {
  success: boolean
  data: {
    id: string
    email: string
    preferredUsername: string
    riskTolerance: string | null
  }
  error: null
  details: null
}

function profileEnvelope(riskTolerance: string | null): ProfileEnvelope {
  return {
    success: true,
    data: {
      id: DEV_USER_ID,
      email: "dev@kontor.local",
      preferredUsername: "dev",
      riskTolerance,
    },
    error: null,
    details: null,
  }
}

test("prompts a first-time user to set their risk tolerance", async ({
  page,
}) => {
  await page.route("**/api/v1/profile", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: profileEnvelope(null) })
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
      await route.fulfill({ json: profileEnvelope("MODERATE") })
      return
    }
    await route.fulfill({ json: profileEnvelope(saved ? "MODERATE" : null) })
  })

  await page.goto("/")

  const dialog = page.getByRole("alertdialog")
  await expect(dialog.getByText("Set your risk tolerance")).toBeVisible()

  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Moderate" }).click()
  await page.getByRole("button", { name: "Get started" }).click()

  await expect(dialog).toBeHidden()
  expect(saved).toBe(true)
})

test("does not prompt a user who already set their risk tolerance", async ({
  page,
}) => {
  await page.route("**/api/v1/profile", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: profileEnvelope("AGGRESSIVE") })
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

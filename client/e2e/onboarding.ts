import { expect, type Page } from "@playwright/test"

// The dialog only appears once the profile query resolves, a beat after the
// page shell (and its static heading) render. We must wait for it rather than
// check instantaneously, or a fresh user is left un-onboarded and the modal
// blocks every later interaction.
const DIALOG_TIMEOUT_MS = 15_000

/**
 * Completes the first-run "Set your risk tolerance" dialog if it appears.
 *
 * The dialog is a blocking modal shown for any user whose profile has no risk
 * tolerance set yet (e.g. a freshly provisioned user after a database wipe, as
 * in CI). It aria-hides the rest of the page, so authenticated flows must clear
 * it before they can interact with the portfolio. No-op when already onboarded.
 */
export async function completeRiskToleranceIfPresent(
  page: Page,
): Promise<void> {
  const dialog = page.getByRole("alertdialog")
  try {
    await dialog.waitFor({ state: "visible", timeout: DIALOG_TIMEOUT_MS })
  } catch {
    // No dialog appeared within the window — the user is already onboarded.
    return
  }

  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Moderate" }).click()
  await page.getByRole("button", { name: "Get started" }).click()
  await expect(dialog).toBeHidden()
}

import { expect, type Page } from "@playwright/test"

// The dialog only appears once the profile query resolves. We wait for the
// page's network to go idle (so that query has run) rather than blindly waiting
// a long fixed timeout, then give the dialog a brief window to mount. Checking
// instantaneously would leave a fresh user un-onboarded with the modal blocking
// every later interaction.
const SETTLE_TIMEOUT_MS = 15_000
const DIALOG_RENDER_TIMEOUT_MS = 2_000

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
  // Wait for the network to settle so the profile query — which decides whether
  // the dialog mounts — has resolved. The app has no polling or websocket loop,
  // so a healthy page always reaches network idle; we let a timeout propagate
  // (e.g. the backend is down) rather than swallow it and run the dialog check
  // against a broken page, which would silently pass as "already onboarded".
  await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS })
  try {
    await dialog.waitFor({
      state: "visible",
      timeout: DIALOG_RENDER_TIMEOUT_MS,
    })
  } catch {
    // No dialog appeared once the page settled — the user is already onboarded.
    return
  }

  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Moderate" }).click()
  await page.getByRole("button", { name: "Get started" }).click()
  await expect(dialog).toBeHidden()
}

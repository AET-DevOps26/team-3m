import { expect, type Page } from "@playwright/test"

/**
 * Completes the first-run "Set your risk tolerance" dialog if it is showing.
 *
 * The dialog is a blocking modal that appears for any user whose profile has
 * no risk tolerance set yet (e.g. a freshly provisioned user after a database
 * wipe). It aria-hides the rest of the page, so authenticated flows must clear
 * it before they can interact with the portfolio. No-op when already onboarded.
 */
export async function completeRiskToleranceIfPresent(
  page: Page,
): Promise<void> {
  const dialog = page.getByRole("alertdialog")
  if (!(await dialog.isVisible())) return

  await page.getByRole("combobox").click()
  await page.getByRole("option", { name: "Moderate" }).click()
  await page.getByRole("button", { name: "Get started" }).click()
  await expect(dialog).toBeHidden()
}

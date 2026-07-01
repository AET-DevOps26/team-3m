import type { Page } from "@playwright/test"

/**
 * Establishes the authenticated session for a fresh page before navigating to a
 * deep route.
 *
 * The app keeps its OIDC tokens in sessionStorage, which Playwright's
 * storageState does not persist (only cookies and localStorage are). A fresh
 * page therefore starts without tokens and, on its first navigation, redirects
 * through Keycloak; the OIDC callback always returns to "/", dropping whatever
 * deep route was requested. Loading "/" first lets the persisted Keycloak SSO
 * cookie re-establish the session into the tab's sessionStorage, so the next
 * navigation in the same tab stays authenticated and keeps its route.
 */
export async function primeSession(page: Page): Promise<void> {
  await page.goto("/")
  await page.getByRole("heading", { name: "Portfolio Overview" }).waitFor()
}

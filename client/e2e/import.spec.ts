import { Buffer } from "node:buffer"
import { expect, type Page, test } from "@playwright/test"
import { fulfillOk } from "./stubs"

const IMPORT_ROUTE = /\/api\/v1\/financial-transactions\/import/

const CSV_FILE = {
  name: "transactions.csv",
  mimeType: "text/csv",
  buffer: Buffer.from("date,amount\n2026-02-03,-1885\n"),
}

async function openImportDialog(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Import CSV" }).click()
  await expect(
    page.getByRole("dialog").getByText("Import Transactions"),
  ).toBeVisible()
}

test("opens the import dialog with the CSV dropzone", async ({ page }) => {
  await openImportDialog(page)

  await expect(page.getByText("Drag & drop a CSV file")).toBeVisible()
})

test("imports a CSV file and reports success", async ({ page }) => {
  await page.route(IMPORT_ROUTE, async (route) => {
    await fulfillOk(route, {
      importedCount: 3,
      message: "Imported 3 transactions",
    })
  })

  await openImportDialog(page)
  await page.locator('input[type="file"]').setInputFiles(CSV_FILE)

  await expect(page.getByText("Import successful")).toBeVisible()
  await expect(
    page.getByText(/3 transactions imported from transactions\.csv/),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "View transactions" }),
  ).toBeVisible()
})

test("shows an error when the upload fails", async ({ page }) => {
  await page.route(IMPORT_ROUTE, async (route) => {
    await route.fulfill({
      status: 500,
      json: { message: "Server error" },
    })
  })

  await openImportDialog(page)
  await page.locator('input[type="file"]').setInputFiles(CSV_FILE)

  await expect(page.getByText("Upload failed")).toBeVisible()
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
})

test("rejects a non-CSV file before uploading", async ({ page }) => {
  await openImportDialog(page)

  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a csv"),
  })

  await expect(page.getByText(/is not a CSV file/)).toBeVisible()
})

import { API_BASE_URL } from "./config"

interface CsvImportResult {
  importedCount: number
  message: string
}

interface CsvRowValidationError {
  row: number
  field: string
  message: string
}

interface CsvImportError {
  success: false
  message: string
  errors: CsvRowValidationError[]
}

type ImportResult =
  | { ok: true; data: CsvImportResult }
  | { ok: false; error: CsvImportError }

export type {
  CsvImportError,
  CsvImportResult,
  CsvRowValidationError,
  ImportResult,
}

export async function importTransactionsCsv(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append("file", file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_BASE_URL}/api/v1/financial-transactions/import`)

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      try {
        const body = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ok: true, data: body as CsvImportResult })
        } else {
          resolve({ ok: false, error: body as CsvImportError })
        }
      } catch {
        reject(new Error(`Unexpected response: ${xhr.statusText}`))
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Network error — is the server running?"))
    })

    xhr.send(formData)
  })
}

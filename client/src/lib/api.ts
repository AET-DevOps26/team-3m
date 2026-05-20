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

function toImportError(body: unknown, xhr: XMLHttpRequest): CsvImportError {
  if (body && typeof body === "object") {
    const candidate = body as Partial<CsvImportError>
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : `Upload failed (HTTP ${xhr.status})`
    const errors = Array.isArray(candidate.errors) ? candidate.errors : []
    return { success: false, message, errors }
  }
  return {
    success: false,
    message: `Upload failed (HTTP ${xhr.status})`,
    errors: [],
  }
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
      let body: unknown
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined
      } catch {
        // Non-JSON body — fall through to the generic shape below.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: body as CsvImportResult })
        return
      }

      resolve({ ok: false, error: toImportError(body, xhr) })
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Network error — is the server running?"))
    })

    xhr.send(formData)
  })
}

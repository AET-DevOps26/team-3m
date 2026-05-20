import { API_BASE_URL } from "../config"
import { APIError } from "../errors"

export interface UploadFileOptions {
  path: string
  file: File
  fieldName?: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export function uploadFile<T>(options: UploadFileOptions): Promise<T> {
  const { path, file, fieldName = "file", onProgress, signal } = options

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new APIError({ code: "aborted", message: "Upload cancelled" }))
      return
    }

    const formData = new FormData()
    formData.append(fieldName, file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${API_BASE_URL}${path}`)

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      })
    }

    xhr.addEventListener("load", () => {
      const data = parseResponse(xhr.responseText)

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T)
        return
      }

      reject(
        new APIError({
          code: xhr.status === 400 ? "validation" : "http",
          status: xhr.status,
          message: extractErrorMessage(data, xhr),
          details: data,
        }),
      )
    })

    xhr.addEventListener("error", () => {
      reject(
        new APIError({
          code: "network",
          message: "Network error — please check your connection",
        }),
      )
    })

    xhr.addEventListener("abort", () => {
      reject(new APIError({ code: "aborted", message: "Upload cancelled" }))
    })

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })
}

function parseResponse(text: string): unknown {
  if (text === "") {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, xhr: XMLHttpRequest): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === "string" && message.length > 0) {
      return message
    }
  }
  if (typeof data === "string" && data.length > 0) {
    return data
  }
  return `HTTP ${xhr.status} ${xhr.statusText}`
}

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

    let settled = false
    function settle() {
      settled = true
    }

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (settled || !event.lengthComputable) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      })
    }

    xhr.addEventListener("load", () => {
      settle()
      let data: unknown
      try {
        data = parseResponseBody(xhr.responseText)
      } catch (cause) {
        reject(cause as APIError)
        return
      }

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
      settle()
      reject(
        new APIError({
          code: "network",
          message: "Network error — please check your connection",
        }),
      )
    })

    xhr.addEventListener("abort", () => {
      settle()
      reject(new APIError({ code: "aborted", message: "Upload cancelled" }))
    })

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })
}

function parseResponseBody(text: string): unknown {
  if (text === "") {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (cause) {
    throw new APIError({
      code: "parse",
      message: "Server returned an unparsable response",
      cause,
      details: text,
    })
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

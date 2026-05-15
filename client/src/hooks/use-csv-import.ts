import { useCallback, useState } from "react"
import {
  type CsvImportError,
  type CsvImportResult,
  importTransactionsCsv,
} from "@/lib/api"

type ImportState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "success"; data: CsvImportResult; fileName: string }
  | { status: "validation-error"; error: CsvImportError; fileName: string }
  | { status: "error"; message: string; fileName: string }

export function useCsvImport() {
  const [state, setState] = useState<ImportState>({ status: "idle" })

  const upload = useCallback(async (file: File) => {
    setState({ status: "uploading", progress: 0, fileName: file.name })

    try {
      const result = await importTransactionsCsv(file, (progress) => {
        setState((prev) =>
          prev.status === "uploading" ? { ...prev, progress } : prev,
        )
      })

      if (result.ok) {
        setState({ status: "success", data: result.data, fileName: file.name })
      } else {
        setState({
          status: "validation-error",
          error: result.error,
          fileName: file.name,
        })
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred"
      setState({ status: "error", message, fileName: file.name })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ status: "idle" })
  }, [])

  return { state, upload, reset }
}

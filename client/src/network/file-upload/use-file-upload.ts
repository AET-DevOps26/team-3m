import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { APIError, type ErrorFormatter } from "../errors"
import { uploadFile } from "./upload-file"

export interface UseFileUploadOptions<T> {
  path: string
  fieldName?: string
  errorFormatter: ErrorFormatter
  parseResponse?: (raw: unknown) => T
  onSuccess?: (data: T, file: File) => void
}

export type UseFileUploadResult<T> = UseMutationResult<T, APIError, File> & {
  progress: number
  fileName: string | null
  upload: UseMutationResult<T, APIError, File>["mutate"]
}

export function useFileUpload<T>(
  options: UseFileUploadOptions<T>,
): UseFileUploadResult<T> {
  const [progress, setProgress] = useState(0)
  const [activeFileName, setActiveFileName] = useState<string | null>(null)

  const mutation = useMutation<T, APIError, File>({
    mutationFn: async (file) => {
      const raw = await uploadFile<unknown>({
        path: options.path,
        file,
        fieldName: options.fieldName,
        onProgress: setProgress,
      })
      if (!options.parseResponse) {
        return raw as T
      }
      try {
        return options.parseResponse(raw)
      } catch (cause) {
        throw new APIError({
          code: "parse",
          message: "Unexpected server response",
          cause,
          details: raw,
        })
      }
    },
    onMutate: (file) => {
      setProgress(0)
      setActiveFileName(file.name)
    },
    onSuccess: (data, file) => {
      options.onSuccess?.(data, file)
    },
    meta: {
      errorFormatter: options.errorFormatter,
    },
  })

  function reset() {
    setProgress(0)
    setActiveFileName(null)
    mutation.reset()
  }

  return {
    ...mutation,
    upload: mutation.mutate,
    progress,
    fileName: activeFileName,
    reset,
  }
}

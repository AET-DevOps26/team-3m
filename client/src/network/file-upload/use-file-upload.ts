import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { ZodError } from "zod"
import { APIError, type ErrorFormatter } from "../errors"
import { uploadFile } from "./upload-file"

export interface UseFileUploadOptions<T> {
  path: string
  fieldName?: string
  errorFormatter?: ErrorFormatter
  parseResponse?: (raw: unknown) => T
  onSuccess?: (data: T, file: File) => void
  silent?: boolean
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
  const abortRef = useRef<AbortController | null>(null)

  const mutation = useMutation<T, APIError, File>({
    mutationFn: async (file) => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const raw = await uploadFile<unknown>({
          path: options.path,
          file,
          fieldName: options.fieldName,
          onProgress: setProgress,
          signal: controller.signal,
        })
        if (!options.parseResponse) {
          return raw as T
        }
        try {
          return options.parseResponse(raw)
        } catch (cause) {
          if (cause instanceof ZodError) {
            throw new APIError({
              code: "parse",
              message: "Unexpected server response",
              cause,
              details: cause.issues,
            })
          }
          throw cause
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
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
      silent: options.silent,
    },
  })

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function reset() {
    abortRef.current?.abort()
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

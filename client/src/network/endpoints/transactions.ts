import { z } from "zod"
import { pluralize } from "@/lib/pluralize"
import { APIError, RecoverableError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"

const IMPORT_PATH = "/api/v1/financial-transactions/import"

const csvRowValidationErrorSchema = z.object({
  row: z.number().int(),
  field: z.string(),
  message: z.string(),
})

const csvValidationFailureSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(csvRowValidationErrorSchema),
})

const importTransactionsCsvResultSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  message: z.string(),
})

export type CsvRowValidationError = z.infer<typeof csvRowValidationErrorSchema>
export type CsvValidationFailure = z.infer<typeof csvValidationFailureSchema>
export type ImportTransactionsCsvResult = z.infer<
  typeof importTransactionsCsvResultSchema
>

export interface UseImportTransactionsCsvOptions {
  onSuccess?: (result: ImportTransactionsCsvResult, file: File) => void
}

export function useImportTransactionsCsv(
  options: UseImportTransactionsCsvOptions = {},
) {
  return useFileUpload<ImportTransactionsCsvResult>({
    path: IMPORT_PATH,
    onSuccess: options.onSuccess,
    parseResponse: (raw) => importTransactionsCsvResultSchema.parse(raw),
    errorFormatter: (error) => {
      const failure = parseValidationFailure(error.details)
      if (error.code === "validation" && failure) {
        return new RecoverableError({
          message: failure.message,
          title: "CSV validation failed",
          presentation: {
            detail: formatValidationDetail(failure),
            hideCancel: true,
          },
        })
      }
      return RecoverableError.wrapping(error, { title: "Could not import CSV" })
    },
  })
}

export function extractValidationFailure(
  error: unknown,
): CsvValidationFailure | null {
  if (error instanceof APIError) {
    return parseValidationFailure(error.details)
  }
  return null
}

function parseValidationFailure(value: unknown): CsvValidationFailure | null {
  const result = csvValidationFailureSchema.safeParse(value)
  return result.success ? result.data : null
}

function formatValidationDetail(failure: CsvValidationFailure): string {
  if (failure.errors.length === 0) return failure.message
  return `${pluralize(failure.errors.length, "row")} could not be imported.`
}

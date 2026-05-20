import { z } from "zod"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"

const IMPORT_PATH = "/api/v1/financial-transactions/import"

const csvRowValidationErrorSchema = z.object({
  row: z.number().int(),
  field: z.string(),
  message: z.string(),
})

const csvValidationFailureSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(csvRowValidationErrorSchema).nullable().optional(),
})

const importTransactionsCsvResultSchema = z.object({
  importedCount: z.number().int().nonnegative(),
  message: z.string(),
})

const importTransactionsCsvEnvelopeSchema = z.object({
  success: z.literal(true),
  data: importTransactionsCsvResultSchema,
})

export type CsvRowValidationError = z.infer<typeof csvRowValidationErrorSchema>
export type CsvValidationFailure = {
  message: string
  errors: CsvRowValidationError[]
}
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
    silent: true,
    parseResponse: (raw) => importTransactionsCsvEnvelopeSchema.parse(raw).data,
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
  if (!result.success) return null
  return {
    message: result.data.error,
    errors: result.data.details ?? [],
  }
}

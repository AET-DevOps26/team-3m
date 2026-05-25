import { z } from "zod"
import type { components, paths } from "../api"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"

const IMPORT_PATH =
  "/api/v1/financial-transactions/import" satisfies keyof paths

export type ImportTransactionsCsvResult =
  components["schemas"]["CsvImportResult"]

type ImportTransactionsCsvEnvelope =
  components["schemas"]["CsvImportApiResponse"]

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

export type CsvRowValidationError = z.infer<typeof csvRowValidationErrorSchema>
export type CsvValidationFailure = {
  message: string
  errors: CsvRowValidationError[]
}

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
    parseResponse: (raw) => unwrapImportEnvelope(raw),
  })
}

function unwrapImportEnvelope(raw: unknown): ImportTransactionsCsvResult {
  if (!isImportEnvelope(raw) || !raw.success || !isCsvImportResult(raw.data)) {
    throw new APIError({
      code: "parse",
      message: "Unexpected server response",
      details: raw,
    })
  }
  return raw.data
}

function isImportEnvelope(
  value: unknown,
): value is ImportTransactionsCsvEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { success?: unknown }).success === "boolean"
  )
}

function isCsvImportResult(
  value: unknown,
): value is ImportTransactionsCsvResult {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.importedCount === "number" &&
    typeof candidate.message === "string"
  )
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

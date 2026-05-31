import { z } from "zod"
import type { components } from "../api"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"
import {
  csvImportApiResponseSchema,
  csvImportResultSchema,
} from "../generated/zod.gen"

const IMPORT_PATH = "/api/v1/financial-transactions/import"

export type ImportTransactionsCsvResult =
  components["schemas"]["CsvImportResult"]

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

const importTransactionsCsvEnvelopeSchema = csvImportApiResponseSchema.extend({
  success: z.literal(true),
  data: csvImportResultSchema,
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
  const result = importTransactionsCsvEnvelopeSchema.safeParse(raw)
  if (!result.success) {
    throw new APIError({
      code: "parse",
      message: "Unexpected server response",
      details: raw,
    })
  }
  return result.data.data
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

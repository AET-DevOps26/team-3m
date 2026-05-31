import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"
import { httpRequest } from "../http"

const BASE_PATH = "/api/v1/financial-transactions"
const IMPORT_PATH = `${BASE_PATH}/import`

const transactionSchema = z.object({
  id: z.string().uuid(),
  datetime: z.string(),
  date: z.string(),
  accountType: z.string(),
  category: z.string(),
  type: z.string(),
  assetClass: z.string().nullable(),
  name: z.string().nullable(),
  symbol: z.string().nullable(),
  shares: z.number().nullable(),
  price: z.number().nullable(),
  amount: z.number(),
  fee: z.number().nullable(),
  tax: z.number().nullable(),
  currency: z.string(),
  originalAmount: z.number().nullable(),
  originalCurrency: z.string().nullable(),
  fxRate: z.number().nullable(),
  description: z.string().nullable(),
  externalTransactionId: z.string().uuid().nullable(),
  counterpartyName: z.string().nullable(),
  counterpartyIban: z.string().nullable(),
  paymentReference: z.string().nullable(),
  mccCode: z.string().nullable(),
})

const transactionListEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(transactionSchema),
})

export type Transaction = z.infer<typeof transactionSchema>

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const raw = await httpRequest<unknown>({ path: BASE_PATH })
      return transactionListEnvelopeSchema.parse(raw).data
    },
  })
}

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

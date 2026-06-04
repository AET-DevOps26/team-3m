import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { z } from "zod"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"
import type { CsvImportResult } from "../generated"
import {
  csvImportApiResponseSchema,
  csvImportResultSchema,
} from "../generated/zod.gen"
import { httpRequest } from "../http"

const BASE_PATH = "/api/v1/financial-transactions"
const IMPORT_PATH = `${BASE_PATH}/import`
const PAGE_SIZE = 200

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

const transactionCursorSchema = z.object({
  afterDatetime: z.string(),
  afterId: z.string().uuid(),
})

const transactionPageEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(transactionSchema),
    nextCursor: transactionCursorSchema.nullable(),
  }),
})

type TransactionCursorParams = z.infer<typeof transactionCursorSchema>

export type Transaction = z.infer<typeof transactionSchema>

/**
 * Fetches all transactions via keyset-paginated pages and returns the full flat
 * list. Client-side filters in the UI are applied over the accumulated result.
 */
export function useTransactions() {
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: async ({
      pageParam,
    }: {
      pageParam: TransactionCursorParams | null
    }) => {
      const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) })
      if (pageParam) {
        params.set("afterDatetime", pageParam.afterDatetime)
        params.set("afterId", pageParam.afterId)
      }
      const raw = await httpRequest<unknown>({
        path: `${BASE_PATH}?${params}`,
      })
      return transactionPageEnvelopeSchema.parse(raw).data
    },
    initialPageParam: null as TransactionCursorParams | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Auto-fetch remaining pages so all client-side filters work on complete data
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const transactions = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  )

  return { data: transactions, isPending, isError, error }
}

export type ImportTransactionsCsvResult = CsvImportResult

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

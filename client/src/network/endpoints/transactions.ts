import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { z } from "zod"
import { apiClient } from "../api-client"
import { APIError } from "../errors"
import { useFileUpload } from "../file-upload/use-file-upload"
import type { CsvImportResult } from "../generated"
import {
  csvImportApiResponseSchema,
  csvImportResultSchema,
  financialTransactionResponseSchema,
  listTransactionsApiResponseSchema,
  transactionCursorSchema,
  transactionPageSchema,
} from "../generated/zod.gen"

const BASE_PATH = "/api/v1/financial-transactions"
const IMPORT_PATH = `${BASE_PATH}/import`
const PAGE_SIZE = 200

// z.iso.datetime() in Zod v4 only accepts Z suffix, but Java/Jackson serialises
// OffsetDateTime with +HH:MM offsets (e.g. +00:00). Use the offset-aware variant.
const datetimeWithOffset = z.string().datetime({ offset: true })

const transactionSchema = financialTransactionResponseSchema.extend({
  datetime: datetimeWithOffset,
})

const transactionEnvelopeSchema = listTransactionsApiResponseSchema.extend({
  success: z.literal(true),
  data: transactionPageSchema.extend({
    items: z.array(transactionSchema),
    nextCursor: transactionCursorSchema
      .extend({ afterDatetime: datetimeWithOffset })
      .nullish(),
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
      const { data: raw } = await apiClient.GET(
        "/api/v1/financial-transactions",
        {
          params: {
            query: {
              pageSize: PAGE_SIZE,
              ...pageParam,
            },
          },
        },
      )
      const result = transactionEnvelopeSchema.safeParse(raw)
      if (!result.success) {
        throw new APIError({
          code: "parse",
          message: "Unexpected response from server",
          details: raw,
        })
      }
      return result.data.data
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

  const isLoadingAll = isPending || hasNextPage || isFetchingNextPage
  return { data: transactions, isPending: isLoadingAll, isError, error }
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
  const queryClient = useQueryClient()

  return useFileUpload<ImportTransactionsCsvResult>({
    path: IMPORT_PATH,
    onSuccess: (result, file) => {
      void queryClient.resetQueries({ queryKey: ["portfolio"] })
      void queryClient.resetQueries({ queryKey: ["transactions"] })
      options.onSuccess?.(result, file)
    },
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

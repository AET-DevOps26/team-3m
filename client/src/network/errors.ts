import type * as React from "react"

export type APIErrorCode =
  | "network"
  | "http"
  | "validation"
  | "parse"
  | "aborted"
  | "unknown"

export interface APIErrorOptions {
  code: APIErrorCode
  message: string
  status?: number
  details?: unknown
  cause?: unknown
}

export class APIError extends Error {
  readonly code: APIErrorCode
  readonly status?: number
  readonly details?: unknown

  constructor(options: APIErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined)
    this.name = "APIError"
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

export type RecoveryOptionVariant = "default" | "destructive" | "outline"

export interface RecoveryOption {
  label: string
  action: () => void | Promise<void>
  variant?: RecoveryOptionVariant
}

export interface RecoverableErrorPresentation {
  debugInfo?: string | React.ReactNode
  detail?: string | React.ReactNode
  hideCancel?: boolean
}

export interface RecoverableErrorOptions {
  message: string
  title?: string
  recoveryOptions?: RecoveryOption[]
  presentation?: RecoverableErrorPresentation
}

export interface RecoverableErrorWrappingOptions {
  title?: string
  recoveryOptions?: RecoveryOption[]
}

export class RecoverableError extends Error {
  readonly title?: string
  readonly recoveryOptions: RecoveryOption[]
  readonly presentation: RecoverableErrorPresentation

  constructor(options: RecoverableErrorOptions) {
    super(options.message)
    this.name = "RecoverableError"
    this.title = options.title
    this.recoveryOptions = options.recoveryOptions ?? []
    this.presentation = options.presentation ?? {}
  }

  static wrapping(
    error: unknown,
    fallback: RecoverableErrorWrappingOptions = {},
  ): RecoverableError {
    const extraOptions = fallback.recoveryOptions ?? []

    if (error instanceof RecoverableError) {
      return new RecoverableError({
        message: error.message,
        title: fallback.title ?? error.title,
        recoveryOptions: [...error.recoveryOptions, ...extraOptions],
        presentation: error.presentation,
      })
    }

    if (error instanceof APIError) {
      return new RecoverableError({
        message: error.message,
        title: fallback.title ?? defaultTitleForAPIError(error),
        recoveryOptions: extraOptions,
        presentation: {
          detail:
            error.details !== undefined
              ? safeStringify(error.details)
              : undefined,
          debugInfo: error.code,
        },
      })
    }

    const message = error instanceof Error ? error.message : "Unexpected error"
    return new RecoverableError({
      message,
      title: fallback.title,
      recoveryOptions: extraOptions,
    })
  }
}

export type ErrorFormatter = (error: APIError) => RecoverableError

function defaultTitleForAPIError(error: APIError): string {
  switch (error.code) {
    case "network":
      return "Connection problem"
    case "validation":
      return "Invalid input"
    case "http":
      return error.status
        ? `Request failed (${error.status})`
        : "Request failed"
    case "aborted":
      return "Request cancelled"
    case "parse":
      return "Unexpected server response"
    default:
      return "Something went wrong"
  }
}

function safeStringify(value: unknown): string | undefined {
  try {
    return typeof value === "string" ? value : JSON.stringify(value)
  } catch {
    return undefined
  }
}

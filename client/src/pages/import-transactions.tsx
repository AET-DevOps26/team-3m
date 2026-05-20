import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react"
import { type ChangeEvent, type DragEvent, useId, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { pluralize } from "@/lib/pluralize"
import { cn } from "@/lib/utils"
import {
  type CsvValidationFailure,
  extractValidationFailure,
  useImportTransactionsCsv,
} from "@/network/endpoints/transactions"

const ACCEPTED_TYPE = "text/csv"
const ACCEPTED_EXTENSION = ".csv"

export function ImportTransactionsPage() {
  const importCsv = useImportTransactionsCsv({
    onSuccess: (result, file) => {
      toast.success("Import successful", {
        description: `${pluralize(result.importedCount, "transaction")} imported from ${file.name}.`,
      })
    },
  })

  const validationFailure = extractValidationFailure(importCsv.error)
  const otherErrorMessage =
    !validationFailure && importCsv.error ? importCsv.error.message : null

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-xl flex-col items-start gap-4 sm:gap-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft />
            Back
          </Link>
        </Button>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              Import Transactions
            </CardTitle>
            <CardDescription>
              Upload a CSV file to import financial transactions. Duplicate
              transactions will be updated automatically.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {importCsv.status === "idle" && (
              <CsvDropzone onFileSelected={importCsv.upload} />
            )}

            {importCsv.status === "pending" && (
              <UploadProgress
                fileName={importCsv.fileName ?? ""}
                progress={importCsv.progress}
              />
            )}

            {importCsv.status === "success" && importCsv.data && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="text-success" />
                  <AlertTitle>Import successful</AlertTitle>
                  <AlertDescription>
                    {pluralize(importCsv.data.importedCount, "transaction")}{" "}
                    imported from {importCsv.fileName}.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={importCsv.reset}>
                  Import another file
                </Button>
              </div>
            )}

            {validationFailure && (
              <ValidationFailureView
                failure={validationFailure}
                onRetry={importCsv.reset}
              />
            )}

            {otherErrorMessage && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Upload failed</AlertTitle>
                  <AlertDescription>{otherErrorMessage}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={importCsv.reset}>
                  Try again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function isCsvFile(file: File): boolean {
  return (
    file.type === ACCEPTED_TYPE ||
    file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION)
  )
}

interface CsvDropzoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

function CsvDropzone({ onFileSelected, disabled }: CsvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)
  const inputId = useId()

  function handleFile(file: File) {
    if (!isCsvFile(file)) {
      setInvalidMessage(
        `"${file.name}" is not a CSV file. Please choose a .csv file.`,
      )
      return
    }
    setInvalidMessage(null)
    onFileSelected(file)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragOver(false)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors sm:p-10",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload
          className={cn(
            "size-8 sm:size-10",
            isDragOver ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragOver ? "Drop your CSV file here" : "Drag & drop a CSV file"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse files
          </p>
        </div>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
        />
      </label>

      {invalidMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{invalidMessage}</span>
          <button
            type="button"
            onClick={() => setInvalidMessage(null)}
            className="font-medium underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

interface UploadProgressProps {
  fileName: string
  progress: number
}

function UploadProgress({ fileName, progress }: UploadProgressProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Uploading {fileName}...</p>
          <p className="text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      </div>
      <Progress value={progress} />
    </div>
  )
}

interface ValidationFailureViewProps {
  failure: CsvValidationFailure
  onRetry: () => void
}

function ValidationFailureView({
  failure,
  onRetry,
}: ValidationFailureViewProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Validation failed</AlertTitle>
        <AlertDescription>{failure.message}</AlertDescription>
      </Alert>

      {failure.errors.length > 0 && (
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">Row</th>
                <th className="px-3 py-2 text-left font-medium">Field</th>
                <th className="px-3 py-2 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {failure.errors.map((err) => (
                <tr
                  key={`${err.row}-${err.field}-${err.message}`}
                  className="border-b last:border-0"
                >
                  <td className="px-3 py-2 tabular-nums">{err.row}</td>
                  <td className="px-3 py-2 font-mono text-xs">{err.field}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {err.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

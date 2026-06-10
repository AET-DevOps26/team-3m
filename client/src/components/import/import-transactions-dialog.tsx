import { AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CsvDropzone } from "@/components/import/csv-dropzone"
import { UploadProgress } from "@/components/import/upload-progress"
import { ValidationFailureView } from "@/components/import/validation-failure-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { pluralize } from "@/lib/pluralize"
import {
  extractValidationFailure,
  useImportTransactionsCsv,
} from "@/network/endpoints/transactions"

/**
 * Self-contained "Import CSV" button plus dialog hosting the transaction
 * CSV import flow. Used on the portfolio overview page; resets the upload
 * state whenever the dialog is closed.
 */
export function ImportTransactionsDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const importCsv = useImportTransactionsCsv()

  const validationFailure = useMemo(
    () => extractValidationFailure(importCsv.error),
    [importCsv.error],
  )
  const otherErrorMessage =
    !validationFailure && importCsv.error ? importCsv.error.message : null

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      importCsv.reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <FileSpreadsheet className="size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Import Transactions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import financial transactions. Duplicate
            transactions will be updated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/transactions">View transactions</Link>
                </Button>
                <Button variant="outline" onClick={importCsv.reset}>
                  Import another file
                </Button>
              </div>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { CsvDropzone } from "@/components/csv-dropzone"
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
import { useCsvImport } from "@/hooks/use-csv-import"

export function ImportTransactionsPage() {
  const { state, upload, reset } = useCsvImport()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-xl flex-col items-start gap-6">
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
            {state.status === "idle" && <CsvDropzone onFileSelected={upload} />}

            {state.status === "uploading" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Uploading {state.fileName}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {state.progress}% complete
                    </p>
                  </div>
                </div>
                <Progress value={state.progress} />
              </div>
            )}

            {state.status === "success" && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="text-chart-1" />
                  <AlertTitle>Import successful</AlertTitle>
                  <AlertDescription>
                    {state.data.importedCount} transaction
                    {state.data.importedCount !== 1 && "s"} imported from{" "}
                    {state.fileName}.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
              </div>
            )}

            {state.status === "validation-error" && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Validation failed</AlertTitle>
                  <AlertDescription>{state.error.message}</AlertDescription>
                </Alert>

                {state.error.errors.length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium">
                            Row
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Field
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.error.errors.map((err) => (
                          <tr
                            key={`${err.row}-${err.field}-${err.message}`}
                            className="border-b last:border-0"
                          >
                            <td className="px-3 py-2 tabular-nums">
                              {err.row}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {err.field}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button variant="outline" onClick={reset}>
                  Try again
                </Button>
              </div>
            )}

            {state.status === "error" && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Upload failed</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={reset}>
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

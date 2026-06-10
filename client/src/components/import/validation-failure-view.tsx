import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { CsvValidationFailure } from "@/network/endpoints/transactions"

interface ValidationFailureViewProps {
  failure: CsvValidationFailure
  onRetry: () => void
}

/**
 * Error report for a rejected CSV import: shows the failure message plus a
 * per-row error table and a retry action.
 */
export function ValidationFailureView({
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

import { AlertCircle, Upload } from "lucide-react"
import { type ChangeEvent, type DragEvent, useId, useState } from "react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPE = "text/csv"
const ACCEPTED_EXTENSION = ".csv"

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

/**
 * Drag-and-drop CSV file picker used in the transaction-import flow. Validates
 * the selected file is a CSV before handing it to the caller.
 */
export function CsvDropzone({ onFileSelected, disabled }: CsvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)
  const inputId = useId()
  const invalidMessageId = useId()

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
        aria-label="Drop a CSV file here or press Enter to choose a file"
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
          aria-describedby={invalidMessage ? invalidMessageId : undefined}
          aria-invalid={invalidMessage ? true : undefined}
          className="sr-only"
        />
      </label>

      {invalidMessage && (
        <div
          id={invalidMessageId}
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

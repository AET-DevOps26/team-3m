import { Upload } from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useId,
  useState,
} from "react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPE = "text/csv"
const ACCEPTED_EXTENSION = ".csv"

interface CsvDropzoneProps {
  onFileSelected: (file: File) => void
  onRejected?: (reason: string) => void
  disabled?: boolean
}

export function CsvDropzone({
  onFileSelected,
  onRejected,
  disabled,
}: CsvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputId = useId()

  const handleFile = useCallback(
    (file: File) => {
      const hasCsvExtension = file.name
        .toLowerCase()
        .endsWith(ACCEPTED_EXTENSION)
      if (file.type === ACCEPTED_TYPE || hasCsvExtension) {
        onFileSelected(file)
        return
      }
      onRejected?.("Only .csv files are supported.")
    },
    [onFileSelected, onRejected],
  )

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
    event.preventDefault()
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
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
    <label
      htmlFor={inputId}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Upload
        className={cn(
          "size-10",
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
  )
}

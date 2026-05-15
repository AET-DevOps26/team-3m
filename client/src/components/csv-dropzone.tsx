import { Upload } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPE = "text/csv"
const ACCEPTED_EXTENSION = ".csv"

interface CsvDropzoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function CsvDropzone({ onFileSelected, disabled }: CsvDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (
        file.type === ACCEPTED_TYPE ||
        file.name.endsWith(ACCEPTED_EXTENSION)
      ) {
        onFileSelected(file)
      }
    },
    [onFileSelected],
  )

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    setIsDragOver(false)
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
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
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleInputChange}
        className="hidden"
      />
    </button>
  )
}

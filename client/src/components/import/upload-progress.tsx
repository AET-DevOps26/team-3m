import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface UploadProgressProps {
  fileName: string
  progress: number
}

/**
 * Upload status indicator shown in the transaction-import flow while a CSV
 * file is being uploaded.
 */
export function UploadProgress({ fileName, progress }: UploadProgressProps) {
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

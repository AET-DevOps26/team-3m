import { ShieldCheck } from "lucide-react"
import { Suspense, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type RiskTolerance,
  useProfile,
  useUpdateRiskTolerance,
} from "@/network/endpoints/profile"

const RISK_TOLERANCE_OPTIONS: {
  value: RiskTolerance
  label: string
  description: string
}[] = [
  {
    value: "CONSERVATIVE",
    label: "Conservative",
    description: "Prioritise capital preservation, minimal risk",
  },
  {
    value: "MODERATE",
    label: "Moderate",
    description: "Balance growth and stability",
  },
  {
    value: "AGGRESSIVE",
    label: "Aggressive",
    description: "Maximise growth, accept higher volatility",
  },
]

/** Inner component — suspends until profile is loaded. */
function RiskToleranceSetupDialogInner() {
  const { data: profile } = useProfile()
  const updateMutation = useUpdateRiskTolerance()

  const [open, setOpen] = useState(profile.riskTolerance == null)
  const [selected, setSelected] = useState<RiskTolerance | "">("")

  function handleSave() {
    if (!selected) return
    updateMutation.mutate(selected, {
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 shrink-0" />
            Set your risk tolerance
          </AlertDialogTitle>
          <AlertDialogDescription>
            This helps personalise your portfolio recommendations. You can
            change it any time from your profile.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Select
          value={selected}
          onValueChange={(v) => setSelected(v as RiskTolerance)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose your risk tolerance" />
          </SelectTrigger>
          <SelectContent>
            {RISK_TOLERANCE_OPTIONS.map(({ value, label, description }) => (
              <SelectItem key={value} value={value}>
                <span className="font-medium">{label}:</span> {description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {updateMutation.isError && (
          <p className="text-sm text-destructive">
            Failed to save. Please try again.
          </p>
        )}

        <AlertDialogFooter>
          <Button
            onClick={handleSave}
            disabled={!selected || updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? "Saving…" : "Get started"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Shows a blocking dialog prompting first-time users to set their risk
 * tolerance. Renders nothing until the profile query resolves.
 */
export function RiskToleranceSetupDialog() {
  return (
    <Suspense fallback={null}>
      <RiskToleranceSetupDialogInner />
    </Suspense>
  )
}

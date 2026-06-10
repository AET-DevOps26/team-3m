import { CheckIcon, ShieldCheck } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
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
  SelectContent,
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

        <SelectPrimitive.Root
          value={selected}
          onValueChange={(v) => setSelected(v as RiskTolerance)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose your risk tolerance" />
          </SelectTrigger>
          <SelectContent position="popper">
            {RISK_TOLERANCE_OPTIONS.map(({ value, label, description }) => (
              <SelectPrimitive.Item
                key={value}
                value={value}
                className="relative flex w-full cursor-default rounded-md py-2 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
              >
                <span className="pointer-events-none absolute right-2 top-2 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <div className="flex flex-col">
                  <SelectPrimitive.ItemText>
                    <span className="font-medium">{label}</span>
                  </SelectPrimitive.ItemText>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectContent>
        </SelectPrimitive.Root>

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

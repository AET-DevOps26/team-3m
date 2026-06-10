import { ArrowLeft, Check } from "lucide-react"
import { Component, type ReactNode, Suspense, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  type RiskTolerance,
  useProfile,
  useUpdateRiskTolerance,
} from "@/network/endpoints/profile"

const RISK_TOLERANCE_LABELS: Record<RiskTolerance, string> = {
  CONSERVATIVE: "Conservative",
  MODERATE: "Moderate",
  AGGRESSIVE: "Aggressive",
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <p className="py-8 text-center text-sm text-destructive">
          Failed to load profile. Please refresh the page to try again.
        </p>
      )
    }
    return this.props.children
  }
}

function Loading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function ProfileContent() {
  const { data: profile } = useProfile()
  const updateMutation = useUpdateRiskTolerance()

  const [selected, setSelected] = useState<RiskTolerance | "">(
    profile.riskTolerance ?? "",
  )
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (!selected) return
    updateMutation.mutate(selected, {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Risk Tolerance</CardTitle>
        <CardDescription>
          Set your investment risk preference. This is used to personalise
          portfolio recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Select
          value={selected}
          onValueChange={(v) => {
            setSelected(v as RiskTolerance)
            setSaved(false)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your risk tolerance" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RISK_TOLERANCE_LABELS) as RiskTolerance[]).map(
              (value) => (
                <SelectItem key={value} value={value}>
                  {RISK_TOLERANCE_LABELS[value]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {updateMutation.isError && (
          <p className="text-sm text-destructive">
            Failed to save. Please try again.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!selected || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Check className="size-4" />
              Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <div className="flex min-h-svh flex-col items-center bg-background p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <ProfileContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

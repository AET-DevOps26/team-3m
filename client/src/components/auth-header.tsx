import { LogOut, User } from "lucide-react"
import { Suspense } from "react"
import { useAuth } from "react-oidc-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type RiskTolerance,
  useProfile,
  useUpdateRiskTolerance,
} from "@/network/endpoints/profile"

const RISK_TOLERANCE_OPTIONS: { value: RiskTolerance; label: string }[] = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "MODERATE", label: "Moderate" },
  { value: "AGGRESSIVE", label: "Aggressive" },
]

/** Suspends until profile is loaded, then renders the risk tolerance radio group. */
function RiskToleranceItems() {
  const { data: profile } = useProfile()
  const updateMutation = useUpdateRiskTolerance()

  return (
    <DropdownMenuRadioGroup
      value={profile.riskTolerance ?? ""}
      onValueChange={(v) => updateMutation.mutate(v as RiskTolerance)}
    >
      {RISK_TOLERANCE_OPTIONS.map(({ value, label }) => (
        <DropdownMenuRadioItem key={value} value={value} className="py-2">
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/**
 * App-wide header rendered above all protected routes. Shows the authenticated
 * user's name as a dropdown trigger with preferences and logout actions.
 */
export function AuthHeader() {
  const auth = useAuth()

  if (!auth.isAuthenticated || !auth.user) {
    return null
  }

  const oidcProfile = auth.user.profile
  const displayName =
    typeof oidcProfile.preferred_username === "string" &&
    oidcProfile.preferred_username
      ? oidcProfile.preferred_username
      : typeof oidcProfile.email === "string" && oidcProfile.email
        ? oidcProfile.email
        : "Signed in"
  const email = typeof oidcProfile.email === "string" ? oidcProfile.email : null

  return (
    <header className="flex items-center justify-end gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <User data-icon="inline-start" />
            {displayName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground">
              {displayName[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {email && (
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Risk tolerance</DropdownMenuLabel>
            <Suspense
              fallback={
                <div className="flex flex-col gap-1 px-2 py-1">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              }
            >
              <RiskToleranceItems />
            </Suspense>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void auth.signoutRedirect()
            }}
          >
            <LogOut data-icon="inline-start" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

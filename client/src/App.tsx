import { lazy, type ReactNode, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthCallback } from "@/auth/auth-callback"
import { ProtectedRoute } from "@/auth/protected-route"
import { AuthHeader } from "@/components/auth-header"
import { RiskToleranceSetupDialog } from "@/components/risk-tolerance-setup-dialog"
import { RouteFallback } from "@/components/route-fallback"

const StartPage = lazy(() =>
  import("@/pages/start").then((module) => ({
    default: module.StartPage,
  })),
)
const ImportTransactionsPage = lazy(() =>
  import("@/pages/import-transactions").then((module) => ({
    default: module.ImportTransactionsPage,
  })),
)
const PortfolioOverviewPage = lazy(() =>
  import("@/pages/portfolio-overview").then((module) => ({
    default: module.PortfolioOverviewPage,
  })),
)
const ProfilePage = lazy(() =>
  import("@/pages/profile").then((module) => ({
    default: module.ProfilePage,
  })),
)

function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AuthHeader />
      <RiskToleranceSetupDialog />
      {children}
    </ProtectedRoute>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <StartPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedLayout>
                <ImportTransactionsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedLayout>
                <PortfolioOverviewPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedLayout>
                <ProfilePage />
              </ProtectedLayout>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthCallback } from "@/auth/auth-callback"
import { ProtectedRoute } from "@/auth/protected-route"
import { AppHeader } from "@/components/app-header"
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

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppHeader />
                <StartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <AppHeader />
                <ImportTransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <AppHeader />
                <PortfolioOverviewPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

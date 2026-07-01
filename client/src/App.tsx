import { lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthCallback } from "@/auth/auth-callback"
import { AppLayout } from "@/components/app-layout"
import { ErrorBoundary } from "@/components/error-boundary"

const PortfolioOverviewPage = lazy(() =>
  import("@/pages/portfolio-overview").then((module) => ({
    default: module.PortfolioOverviewPage,
  })),
)
const TransactionsPage = lazy(() =>
  import("@/pages/transactions").then((module) => ({
    default: module.TransactionsPage,
  })),
)
const AboutPage = lazy(() =>
  import("@/pages/about").then((module) => ({
    default: module.AboutPage,
  })),
)

function AppErrorFallback() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <p className="text-sm text-destructive">
        Something went wrong loading the app.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Refresh
      </button>
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary fallback={<AppErrorFallback />}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<PortfolioOverviewPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/portfolio" element={<Navigate to="/" replace />} />
            <Route path="/import" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

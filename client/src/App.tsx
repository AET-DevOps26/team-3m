import { lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthCallback } from "@/auth/auth-callback"
import { AppLayout } from "@/components/app-layout"

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

export function App() {
  return (
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
  )
}

export default App

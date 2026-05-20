import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
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

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/import" element={<ImportTransactionsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

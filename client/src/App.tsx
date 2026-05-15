import { BrowserRouter, Route, Routes } from "react-router-dom"
import { StartPage } from "@/components/start-page"
import { ImportTransactionsPage } from "@/pages/import-transactions"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/import" element={<ImportTransactionsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

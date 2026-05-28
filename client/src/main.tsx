import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "@/components/ui/sonner"
import { createQueryClient, RecoveryHost } from "@/network"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import App from "./App.tsx"

const queryClient = createQueryClient()

// biome-ignore lint/style/noNonNullAssertion: root element always exists in index.html
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
        <RecoveryHost />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)

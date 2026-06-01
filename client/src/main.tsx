import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AuthProvider } from "react-oidc-context"
import { authConfig } from "@/auth/auth-config"
import { AuthTokenBridge } from "@/auth/auth-token-bridge"
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
      <AuthProvider {...authConfig}>
        <AuthTokenBridge />
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster />
          <RecoveryHost />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)

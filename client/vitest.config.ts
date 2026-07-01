import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/network/api-client.ts",
        "src/network/auth-token.ts",
        "src/network/errors.ts",
        "src/network/recovery/error-recovery-broker.ts",
      ],
    },
  },
})

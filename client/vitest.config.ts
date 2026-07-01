import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Unit-test config, kept separate from vite.config.ts (which carries the
// dev-server proxy and vite-envs wiring the tests do not need). Playwright E2E
// specs live in ./e2e and are excluded here so the two runners never overlap.
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
    coverage: {
      provider: "v8",
      // Scope coverage to the pure-logic modules these unit tests target. The
      // HTTP client, endpoints and React-Query wiring are exercised by the
      // Playwright E2E suite instead, not by unit tests.
      include: [
        "src/lib/**",
        "src/network/errors.ts",
        "src/network/auth-token.ts",
      ],
    },
  },
})

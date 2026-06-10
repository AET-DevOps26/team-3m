import react from "@vitejs/plugin-react";
import { keycloakify } from "keycloakify/vite-plugin";
import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    keycloakify({
      accountThemeImplementation: "none",
      themeName: "kontor",
      // Emit a single, deterministically-named JAR targeting modern Keycloak
      // (26.x falls under "all-other-versions"). Keeps the providers/ mount and
      // Dockerfile COPY paths stable across rebuilds.
      keycloakVersionTargets: {
        "22-to-25": false,
        "all-other-versions": "kontor-theme.jar"
      },
      environmentVariables: [
        {
          name: "SHADCN_THEME_LOGO_WHITE_URL",
          default: "%BASE_URL%/kontor.png"
        },
        {
          name: "SHADCN_THEME_LOGO_DARK_URL",
          default: "%BASE_URL%/kontor.png"
        },
        { name: "SHADCN_THEME_APP_NAME", default: "Kontor" },
        { name: "SHADCN_THEME_LAYOUT", default: "two-column" },
        { name: "SHADCN_THEME_SIDE_IMAGE_URL", default: "" },
        { name: "SHADCN_THEME_PRESET", default: "neutral" },
        { name: "SHADCN_THEME_BASE", default: "zinc" },
        { name: "SHADCN_THEME_RADIUS", default: "medium" },
        { name: "SHADCN_THEME_FONT", default: "roboto" },
        { name: "SHADCN_THEME_PLACEHOLDER", default: "true" }
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});

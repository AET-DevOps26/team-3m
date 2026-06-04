import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "../core/docs/openapi.yml",
  output: {
    clean: true,
    path: "src/network/generated",
  },
  plugins: [
    "@hey-api/typescript",
    {
      name: "zod",
      definitions: {
        case: "camelCase",
        name: "{{name}}Schema",
      },
      responses: {
        case: "camelCase",
        name: "{{name}}ResponseSchema",
      },
    },
  ],
})

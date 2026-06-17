import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "../ai/docs/openapi.json",
  output: {
    clean: true,
    path: "src/network/generated-ai",
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

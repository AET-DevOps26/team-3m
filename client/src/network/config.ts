export const API_BASE_URL =
  window._ENV_?.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:8080"

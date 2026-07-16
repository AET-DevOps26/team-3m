/** Whether a URL is safe to render as a link href (http/https only). */
export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) {
    return false
  }
  try {
    const { protocol } = new URL(url)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

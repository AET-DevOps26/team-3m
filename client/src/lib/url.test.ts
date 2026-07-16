import { describe, expect, it } from "vitest"
import { isSafeHttpUrl } from "./url"

describe("isSafeHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(isSafeHttpUrl("https://example.com/article")).toBe(true)
  })

  it("accepts http URLs", () => {
    expect(isSafeHttpUrl("http://example.com")).toBe(true)
  })

  it("rejects javascript: URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false)
  })

  it("rejects other schemes", () => {
    expect(isSafeHttpUrl("data:text/html,<script>")).toBe(false)
    expect(isSafeHttpUrl("ftp://example.com")).toBe(false)
  })

  it("rejects empty, null, and malformed values", () => {
    expect(isSafeHttpUrl("")).toBe(false)
    expect(isSafeHttpUrl(null)).toBe(false)
    expect(isSafeHttpUrl(undefined)).toBe(false)
    expect(isSafeHttpUrl("not a url")).toBe(false)
  })
})

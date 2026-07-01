import { describe, expect, it } from "vitest"
import { pluralize } from "./pluralize"

describe("pluralize", () => {
  it("uses the singular form for a count of one", () => {
    expect(pluralize(1, "transaction", { locale: "en" })).toBe("1 transaction")
  })

  it("appends 's' by default for a plural count", () => {
    expect(pluralize(3, "transaction", { locale: "en" })).toBe("3 transactions")
  })

  it("treats zero as plural in English", () => {
    expect(pluralize(0, "item", { locale: "en" })).toBe("0 items")
  })

  it("uses a custom plural form when provided", () => {
    expect(pluralize(2, "entry", { plural: "entries", locale: "en" })).toBe(
      "2 entries",
    )
  })

  it("keeps the singular form with a custom plural when count is one", () => {
    expect(pluralize(1, "entry", { plural: "entries", locale: "en" })).toBe(
      "1 entry",
    )
  })

  it("falls back to the ambient locale when none is given", () => {
    // No locale option: resolves via navigator.language (jsdom) / "en".
    // Pluralization rules are consistent enough here to assert the word form.
    expect(pluralize(1, "file")).toBe("1 file")
    expect(pluralize(4, "file")).toBe("4 files")
  })

  it("respects locale-specific plural rules", () => {
    // French treats 0 and 1 as "one".
    expect(pluralize(0, "élément", { locale: "fr" })).toBe("0 élément")
    expect(pluralize(2, "élément", { locale: "fr" })).toBe("2 éléments")
  })
})

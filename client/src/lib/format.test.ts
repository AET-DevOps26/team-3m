import { describe, expect, it } from "vitest"
import { formatCurrency } from "./format"

// Intl formats against the runtime's default locale, so the exact grouping and
// symbol placement differ per machine (e.g. "$1,000.00" vs "1.000,00 $").
// These tests assert the function's contract — currency styling vs. plain
// fallback and two-decimal precision — rather than a locale-specific string.
describe("formatCurrency", () => {
  it("always renders exactly two fraction digits", () => {
    // Anchored with a single separator so a change to 1 or 3 fraction digits
    // (e.g. "5" or "5.000") would fail rather than slip through.
    expect(formatCurrency(5, "")).toMatch(/^5\D00$/)
    expect(formatCurrency(5.1, "")).toMatch(/^5\D10$/)
  })

  it("rounds to two fraction digits", () => {
    // Values well clear of the .xx5 float-representation edge so the rounding
    // direction is unambiguous: 1.567 -> .57 (up), 1.562 -> .56 (down).
    expect(formatCurrency(1.567, "")).toMatch(/^1\D57$/)
    expect(formatCurrency(1.562, "")).toMatch(/^1\D56$/)
  })

  it("groups thousands regardless of the separator character", () => {
    const formatted = formatCurrency(1234567, "")
    // The digits are preserved...
    expect(formatted.replace(/\D/g, "")).toBe("123456700")
    // ...and grouping separators are actually inserted, so the output is not a
    // bare digit run with a single decimal separator ("1234567.00").
    expect(formatted).not.toMatch(/^\d+\D\d{2}$/)
  })

  it("adds currency styling when a valid currency is given", () => {
    // The currency branch adds a $/USD marker the plain fallback lacks.
    expect(formatCurrency(1000, "USD")).toMatch(/\$|USD/)
    expect(formatCurrency(1000, "USD")).not.toBe(formatCurrency(1000, ""))
  })

  it("distinguishes different currencies", () => {
    expect(formatCurrency(1000, "USD")).not.toBe(formatCurrency(1000, "EUR"))
  })

  it("falls back to plain number formatting when currency is empty", () => {
    // No symbol/code — just the grouped number with two decimals.
    expect(formatCurrency(1000, "")).toMatch(/^1\D?000\D?00$/)
  })

  it("falls back to plain number formatting for an invalid currency code", () => {
    // A malformed code makes Intl throw; the catch branch must recover to the
    // same output as the no-currency path.
    expect(formatCurrency(1000, "INVALIDCODE")).toBe(formatCurrency(1000, ""))
  })

  it("formats negative values", () => {
    expect(formatCurrency(-42, "")).toMatch(/42\D?00/)
    expect(formatCurrency(-42, "")).toMatch(/-|−|\(/)
  })

  it("formats zero", () => {
    expect(formatCurrency(0, "")).toMatch(/0\D?00/)
  })
})

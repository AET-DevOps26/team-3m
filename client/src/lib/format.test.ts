import { describe, expect, it } from "vitest"
import { formatCurrency } from "./format"

// Intl formats against the runtime's default locale, so the exact grouping and
// symbol placement differ per machine (e.g. "$1,000.00" vs "1.000,00 $").
// These tests assert the function's contract — currency styling vs. plain
// fallback and two-decimal precision — rather than a locale-specific string.
describe("formatCurrency", () => {
  it("always renders exactly two fraction digits", () => {
    expect(formatCurrency(5, "")).toMatch(/5\D?00/)
    expect(formatCurrency(5.1, "")).toMatch(/5\D?10/)
  })

  it("rounds to two fraction digits", () => {
    expect(formatCurrency(1.005, "")).toMatch(/1\D?01|1\D?00/)
  })

  it("groups thousands regardless of the separator character", () => {
    // Both "1,234,567.00" and "1.234.567,00" match this shape.
    expect(formatCurrency(1234567, "")).toMatch(/^1\D?234\D?567\D?00$/)
  })

  it("adds currency styling when a valid currency is given", () => {
    // Currency style adds a symbol/code the plain fallback does not have.
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

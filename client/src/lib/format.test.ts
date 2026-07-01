import { describe, expect, it } from "vitest"
import { formatCurrency } from "./format"

describe("formatCurrency", () => {
  it("always renders exactly two fraction digits", () => {
    expect(formatCurrency(5, "")).toMatch(/^5\D00$/)
    expect(formatCurrency(5.1, "")).toMatch(/^5\D10$/)
  })

  it("rounds to two fraction digits", () => {
    expect(formatCurrency(1.567, "")).toMatch(/^1\D57$/)
    expect(formatCurrency(1.562, "")).toMatch(/^1\D56$/)
  })

  it("groups thousands regardless of the separator character", () => {
    const formatted = formatCurrency(1234567, "")
    expect(formatted.replace(/\D/g, "")).toBe("123456700")
    expect(formatted).not.toMatch(/^\d+\D\d{2}$/)
  })

  it("adds currency styling when a valid currency is given", () => {
    expect(formatCurrency(1000, "USD")).toMatch(/\$|USD/)
    expect(formatCurrency(1000, "USD")).not.toBe(formatCurrency(1000, ""))
  })

  it("distinguishes different currencies", () => {
    expect(formatCurrency(1000, "USD")).not.toBe(formatCurrency(1000, "EUR"))
  })

  it("falls back to plain number formatting when currency is empty", () => {
    expect(formatCurrency(1000, "")).toMatch(/^1\D?000\D?00$/)
  })

  it("falls back to plain number formatting for an invalid currency code", () => {
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

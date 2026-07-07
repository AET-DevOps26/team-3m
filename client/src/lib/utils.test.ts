import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("joins multiple class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("drops falsy values", () => {
    expect(cn("px-2", false, null, undefined, "py-1")).toBe("px-2 py-1")
  })

  it("applies conditional class objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active")
  })

  it("merges conflicting Tailwind classes, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("returns an empty string when given no classes", () => {
    expect(cn()).toBe("")
  })
})

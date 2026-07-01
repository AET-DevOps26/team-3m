import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounce } from "./use-debounce"

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 200))
    expect(result.current).toBe("initial")
  })

  it("does not update before the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "a" } },
    )

    rerender({ value: "b" })
    act(() => {
      vi.advanceTimersByTime(199)
    })

    expect(result.current).toBe("a")
  })

  it("updates to the latest value once the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "a" } },
    )

    rerender({ value: "b" })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe("b")
  })

  it("resets the timer on rapid successive changes and only emits the last", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: "a" } },
    )

    rerender({ value: "b" })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    rerender({ value: "c" })
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current).toBe("a")

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe("c")
  })
})

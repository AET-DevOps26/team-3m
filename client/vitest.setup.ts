import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Globals are disabled (tests import from "vitest" explicitly), so
// Testing Library's automatic post-test cleanup is wired up here instead.
afterEach(() => {
  cleanup()
})

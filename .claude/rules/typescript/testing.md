---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---
# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content.

## Unit Testing

Use **Vitest** for client unit tests. Config lives in `client/vitest.config.ts`
(jsdom environment, `@testing-library/react` for hooks/components). Run with
`npm test` (from `client/`); `npm run test:watch` and `npm run test:coverage`
are also available. Unit tests run in CI as part of `client-quality.yml`.

### Keep unit tests in sync with the app (REQUIRED)

Unit tests are part of "done" for logic changes, not an afterthought. In the
**same change** that touches testable logic:

- **New pure logic / hook / utility** (`src/lib/**`, formatters, filters, error
  mapping, custom hooks) → add a co-located `*.test.ts` covering its behavior and
  edge cases (empty input, boundaries, error/fallback branches). Follow TDD where
  practical: write the failing test first, then the implementation.
- **Changed behavior of tested code** (renamed/removed exports, new branches,
  altered return shapes) → update the affected specs so they reflect the new
  behavior. Do not weaken an assertion just to make it pass — confirm the new
  behavior is correct first.
- **Removed logic** → delete the now-dead specs rather than leaving them skipped.
- Keep coverage on the unit-tested surface at or above the 80% bar
  (`npm run test:coverage`).

If you are unsure whether your change affects a unit-tested module, run
`npm test` locally: if it breaks, the tests need updating as part of your change.

### Conventions

- Co-locate specs with the code as `*.test.ts` / `*.test.tsx`. Only files under
  `src/` matching that pattern are picked up — Playwright's `e2e/*.spec.ts`
  suite stays separate.
- Import test globals explicitly from `vitest` (`import { describe, it, expect }
  from "vitest"`); globals are disabled.
- Target pure logic and hooks (`src/lib/**`, error/formatting/filter utilities).
  The HTTP client, endpoints and React-Query wiring are covered by the E2E suite,
  not unit tests.
- Keep assertions deterministic: `Intl`-based output depends on the runtime
  locale, so assert behavior (currency-styled vs. plain, precision) rather than
  exact strings; use `vi.useFakeTimers()` / `vi.setSystemTime()` for anything
  date- or debounce-driven.

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows. The
suite lives in `client/e2e/`, runs with `npm run e2e` (from `client/`), and is
defined as the reusable `E2E Tests` workflow (`.github/workflows/e2e.yml`), which
builds the full stack with Docker Compose before running. On PRs it is opt-in via
the `test:e2e` label (the suite is slow); on `main` it runs unconditionally in
`ci-cd.yml` and blocks the prod deploy unless it passes.

### Keep E2E tests in sync with the app (REQUIRED)

E2E tests are part of "done" for feature work, not an afterthought. In the **same
change** that touches a user-facing flow:

- **New feature / page / user flow** → add Playwright coverage for its critical
  path (and its empty/error states where they exist).
- **Drastic change to an existing flow** (routing, auth, a page's structure, a
  dialog, an API contract the UI depends on) → update the affected specs so they
  reflect the new behavior. Do not weaken an assertion just to make it pass —
  confirm the new behavior is correct first.
- **Removed feature** → delete the now-dead specs rather than leaving them
  skipped.

If you are unsure whether a change is "drastic", run `npm run e2e` locally: if it
breaks, the tests need updating as part of your change.

### Conventions (follow the existing patterns)

- Authenticated specs reuse the saved session from `e2e/auth.setup.ts`. Don't
  re-implement login per spec.
- Keep data-dependent tests deterministic by intercepting the relevant API
  endpoints with the shared fixtures in `e2e/stubs.ts` (live prices and an empty
  CI database make real responses non-deterministic). Stubbed ids must satisfy
  the client's `z.uuid()` validation and datetimes its offset-aware parsing — use
  the helpers in `e2e/stubs.ts`.
- The app stores OIDC tokens in `sessionStorage`, which Playwright does not
  persist, so a fresh page re-authenticates and the callback returns to `/`.
  Before navigating directly to a deep route, call `primeSession` from
  `e2e/session.ts`.
- First-run users hit a blocking risk-tolerance dialog; clear it with
  `completeRiskToleranceIfPresent` from `e2e/onboarding.ts` where needed.

## MCP Support

- **playwright** - You can use the playwright mcp for testing

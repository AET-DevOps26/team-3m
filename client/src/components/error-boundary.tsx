import { Component, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  /** Rendered when the subtree throws. Defaults to a generic message. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render errors in its subtree — including failures thrown by
 * `useSuspenseQuery` — and renders a fallback instead of letting the error
 * propagate. Without a boundary above them, suspense-query failures reach the
 * React root and unmount the entire app (blank screen), so every place that
 * consumes a suspense query must sit under one of these.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <p className="py-8 text-center text-sm text-destructive">
            Something went wrong. Please refresh the page to try again.
          </p>
        )
      )
    }
    return this.props.children
  }
}

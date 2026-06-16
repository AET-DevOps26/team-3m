import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { ProtectedRoute } from "@/auth/protected-route"
import { AppFooter } from "@/components/app-footer"
import { AppHeader } from "@/components/app-header"
import { RouteFallback } from "@/components/route-fallback"

/**
 * Shared shell for all protected routes: auth guard, header with logo and
 * user actions, the routed page content, and the app footer.
 */
export function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <main className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <AppFooter />
      </div>
    </ProtectedRoute>
  )
}

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_HOME } from '../lib/navigation.js'
import ForbiddenPage from '../pages/ForbiddenPage.jsx'

/**
 * Route guard — the single access-control strategy for the whole app.
 *
 * Order matters:
 *   1. session still booting  → spinner (never a flash of the sign-in screen)
 *   2. no session             → /login, carrying the attempted URL in state.from
 *   3. forced password change → /change-password, remembering where they were going
 *   4. wrong role             → explicit 403 screen (not a silent redirect, which
 *                               used to look like a broken link)
 */
export default function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, session, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)]" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--ink)]" />
          Restoring your session…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    /* The full attempted URL (path + query + hash) is preserved so a deep link
       survives the sign-in detour and lands exactly where it was going. */
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (session.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ forced: true, from: location.pathname }} />
  }

  if (allow && session.role !== allow) {
    return (
      <ForbiddenPage
        currentRole={session.role}
        attemptedPath={location.pathname}
        homePath={ROLE_HOME[session.role]}
      />
    )
  }

  return children
}

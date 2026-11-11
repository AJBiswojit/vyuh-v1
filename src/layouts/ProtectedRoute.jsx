import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_HOME } from '../lib/navigation.js'
import ForbiddenPage from '../pages/ForbiddenPage.jsx'

/**
 * Route guard. Unauthenticated users go to the sign-in screen with a return
 * path; authenticated users hitting another role's workspace get a clear
 * 403 screen instead of a silent redirect.
 */
export default function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, session, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)]">
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--ink)]" />
          Restoring your session…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (session.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ forced: true }} />
  }

  if (allow && session.role !== allow) {
    return <ForbiddenPage currentRole={session.role} attemptedPath={location.pathname} homePath={ROLE_HOME[session.role]} />
  }

  return children
}

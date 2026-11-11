import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import ProtectedRoute from './layouts/ProtectedRoute.jsx'
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx'
import { ROLE_HOME } from './lib/navigation.js'
import './index.css'
import './styles/workspace.css'

/* Public site is kept exactly as it was — imported eagerly so the landing page
   never flashes a spinner. Workspaces are code-split per route group. */
import LandingPage from './pages/LandingPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage.jsx'))

const studentRoutes = () => import('./pages/student/routes.jsx')
const facultyRoutes = () => import('./pages/faculty/routes.jsx')
const adminRoutes = () => import('./pages/admin/routes.jsx')

const StudentRoutes = lazy(studentRoutes)
const FacultyRoutes = lazy(facultyRoutes)
const AdminRoutes = lazy(adminRoutes)

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--ink)]" />
        Loading…
      </div>
    </div>
  )
}

function RootRedirect() {
  const { isAuthenticated, session, booting } = useAuth()
  if (booting) return <RouteFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[session.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <Routes>
            {/* ---------------------------- public ---------------------------- */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              }
            />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route
              path="/programs"
              element={
                <PlaceholderPage
                  title="Programs"
                  description="Structured JEE, NEET, and foundation programs built around concept clarity and practice."
                  actionLabel="Back to home"
                />
              }
            />
            <Route
              path="/pricing"
              element={
                <PlaceholderPage
                  title="Pricing"
                  description="Program fees and inclusions. For current batch-wise pricing, please speak to our admissions team."
                  actionLabel="Back to home"
                />
              }
            />
            <Route
              path="/about"
              element={
                <PlaceholderPage
                  title="About Vyuh"
                  description="A focused learning platform built by educators, for serious aspirants."
                  actionLabel="Back to home"
                />
              }
            />
            <Route
              path="/support"
              element={
                <PlaceholderPage
                  title="Support"
                  description="For help with your account, tests, or study material, reach us at hello@vyuh.in."
                  actionLabel="Back to home"
                />
              }
            />
            <Route
              path="/contact"
              element={
                <PlaceholderPage
                  title="Contact"
                  description="Write to hello@vyuh.in and our team will respond within one working day."
                  actionLabel="Back to home"
                />
              }
            />

            {/* --------------------------- workspaces -------------------------- */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allow="student">
                  <WorkspaceLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="*" element={<Suspense fallback={<RouteFallback />}><StudentRoutes /></Suspense>} />
            </Route>

            <Route
              path="/faculty"
              element={
                <ProtectedRoute allow="faculty">
                  <WorkspaceLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="*" element={<Suspense fallback={<RouteFallback />}><FacultyRoutes /></Suspense>} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute allow="admin">
                  <WorkspaceLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="*" element={<Suspense fallback={<RouteFallback />}><AdminRoutes /></Suspense>} />
            </Route>

            {/* ------------------------- app entry alias ----------------------- */}
            <Route path="/app" element={<RootRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

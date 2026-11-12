import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import ProtectedRoute from './layouts/ProtectedRoute.jsx'
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import RouteFallback from './ui/RouteFallback.jsx'
import { destinationFor } from './services/auth.service.js'
import './index.css'
import './styles/workspace.css'

/* Public site — the home page stays eagerly imported so it never flashes a
   spinner. The six inner public pages are code-split: they share one layout and
   are only fetched when a visitor navigates there. Workspaces are code-split per
   route group, unchanged. */
import HomePage from './pages/public/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

const AboutPage = lazy(() => import('./pages/public/AboutPage.jsx'))
const ProgramsPage = lazy(() => import('./pages/public/ProgramsPage.jsx'))
const LearningExperiencePage = lazy(() => import('./pages/public/LearningExperiencePage.jsx'))
const ResourcesPage = lazy(() => import('./pages/public/ResourcesPage.jsx'))
const ResourceDetailPage = lazy(() => import('./pages/public/ResourceDetailPage.jsx'))
const AdmissionsPage = lazy(() => import('./pages/public/AdmissionsPage.jsx'))
const ContactPage = lazy(() => import('./pages/public/ContactPage.jsx'))
const LegalPage = lazy(() => import('./pages/public/LegalPage.jsx'))

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage.jsx'))

const studentRoutes = () => import('./pages/student/routes.jsx')
const facultyRoutes = () => import('./pages/faculty/routes.jsx')
const adminRoutes = () => import('./pages/admin/routes.jsx')

const StudentRoutes = lazy(studentRoutes)
const FacultyRoutes = lazy(facultyRoutes)
const AdminRoutes = lazy(adminRoutes)

function RootRedirect() {
  const { isAuthenticated, session, booting } = useAuth()
  if (booting) return <RouteFallback label="Opening your workspace" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const target = destinationFor(session)
  return <Navigate to={target.to} replace state={target.state} />
}

const WorkspaceSuspense = ({ children }) => (
  <Suspense fallback={<RouteFallback label="Loading section" />}>{children}</Suspense>
)

/* Public pages share one suspense treatment so a slow chunk never shows a
   workspace-styled fallback in the middle of the marketing site. */
const PublicSuspense = ({ children }) => (
  <Suspense fallback={<RouteFallback label="Loading page" />}>{children}</Suspense>
)

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<RouteFallback fullHeight label="Starting Vyuh" />}>
          <ErrorBoundary key="app" resetKey="app" variant="page">
          <Routes>
            {/* ---------------------------- public ---------------------------- */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<PublicSuspense><AboutPage /></PublicSuspense>} />
            <Route path="/programs" element={<PublicSuspense><ProgramsPage /></PublicSuspense>} />
            <Route
              path="/learning-experience"
              element={<PublicSuspense><LearningExperiencePage /></PublicSuspense>}
            />
            <Route path="/resources" element={<PublicSuspense><ResourcesPage /></PublicSuspense>} />
            <Route
              path="/resources/:resourceId"
              element={<PublicSuspense><ResourceDetailPage /></PublicSuspense>}
            />
            <Route path="/admissions" element={<PublicSuspense><AdmissionsPage /></PublicSuspense>} />
            <Route path="/contact" element={<PublicSuspense><ContactPage /></PublicSuspense>} />
            <Route path="/legal" element={<PublicSuspense><LegalPage /></PublicSuspense>} />

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

            {/* Legacy marketing destinations. These were single placeholder
                screens before the public site existed; the routes are kept so an
                old link never 404s, but they now resolve to real pages. */}
            <Route path="/pricing" element={<Navigate to="/admissions" replace />} />
            <Route path="/support" element={<Navigate to="/contact?topic=student" replace />} />

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
              <Route path="*" element={<WorkspaceSuspense><StudentRoutes /></WorkspaceSuspense>} />
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
              <Route path="*" element={<WorkspaceSuspense><FacultyRoutes /></WorkspaceSuspense>} />
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
              <Route path="*" element={<WorkspaceSuspense><AdminRoutes /></WorkspaceSuspense>} />
            </Route>

            {/* ------------------------- app entry alias ----------------------- */}
            <Route path="/app" element={<RootRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

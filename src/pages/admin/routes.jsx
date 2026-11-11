import { Navigate, Route, Routes } from 'react-router-dom'
import AdminOverviewPage from './AdminOverviewPage.jsx'
import AdminUsersPage from './AdminUsersPage.jsx'
import AdminBatchesPage from './AdminBatchesPage.jsx'
import AdminApprovalsPage from './AdminApprovalsPage.jsx'
import AdminPoliciesPage from './AdminPoliciesPage.jsx'
import AdminIntegrityPage from './AdminIntegrityPage.jsx'
import AdminReportsPage from './AdminReportsPage.jsx'
import AdminModerationPage from './AdminModerationPage.jsx'
import AdminAuditLogPage from './AdminAuditLogPage.jsx'
import AdminSettingsPage from './AdminSettingsPage.jsx'
import AdminAccountPage from './AdminAccountPage.jsx'

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="overview" element={<AdminOverviewPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="batches" element={<AdminBatchesPage />} />
      <Route path="approvals" element={<AdminApprovalsPage />} />
      <Route path="policies" element={<AdminPoliciesPage />} />
      <Route path="integrity" element={<AdminIntegrityPage />} />
      <Route path="reports" element={<AdminReportsPage />} />
      <Route path="moderation" element={<AdminModerationPage />} />
      <Route path="audit-log" element={<AdminAuditLogPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
      <Route path="account" element={<AdminAccountPage />} />
      <Route path="*" element={<Navigate to="/admin/overview" replace />} />
    </Routes>
  )
}

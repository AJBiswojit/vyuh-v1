/* Single source of truth for workspace navigation.
   Labels are identical everywhere in the product (sidebar, mobile nav and
   command palette). Current section counts: Student 10 · Faculty 10 ·
   Institute Admin 13. The original entries are preserved; `Payment & Dues`,
   `Support Desk` and `Payments & Dues` were added for the shared fee and
   support workflows. The shared header carries no breadcrumb; `activeNavItem`
   resolves the highlighted sidebar entry only. */

import {
  LayoutDashboard,
  FileText,
  Video,
  PlayCircle,
  TrendingUp,
  MessageSquare,
  CalendarCheck,
  User,
  LifeBuoy,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  Layers,
  CheckSquare,
  Shield,
  FileBarChart,
  Flag,
  ScrollText,
  Settings,
  MonitorPlay,
  Wallet,
} from 'lucide-react'

export const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Institute Admin',
}

export const ROLE_WORKSPACE = {
  student: 'Student workspace',
  faculty: 'Faculty workspace',
  admin: 'Admin workspace',
}

export const NAV_ITEMS = {
  student: [
    { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Exams', to: '/student/exams', icon: FileText },
    { label: 'Live Classes', to: '/student/live-classes', icon: Video },
    { label: 'Recordings', to: '/student/recordings', icon: PlayCircle },
    { label: 'Performance', to: '/student/performance', icon: TrendingUp },
    { label: 'Doubts', to: '/student/doubts', icon: MessageSquare },
    { label: 'Attendance', to: '/student/attendance', icon: CalendarCheck },
    { label: 'Payment & Dues', to: '/student/payment-dues', icon: Wallet },
    { label: 'Profile', to: '/student/profile', icon: User },
    { label: 'Support', to: '/student/support', icon: LifeBuoy },
  ],
  faculty: [
    { label: 'Dashboard', to: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'Question Bank', to: '/faculty/question-bank', icon: BookOpen },
    { label: 'Exams', to: '/faculty/exams', icon: ClipboardList },
    { label: 'Item Analysis', to: '/faculty/item-analysis', icon: BarChart3 },
    { label: 'Classes', to: '/faculty/classes', icon: MonitorPlay },
    { label: 'Recordings', to: '/faculty/recordings', icon: PlayCircle },
    { label: 'Attendance', to: '/faculty/attendance', icon: CalendarCheck },
    { label: 'Doubts', to: '/faculty/doubts', icon: MessageSquare },
    { label: 'Support', to: '/faculty/support', icon: LifeBuoy },
    { label: 'Account', to: '/faculty/account', icon: User },
  ],
  admin: [
    { label: 'Overview', to: '/admin/overview', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Batches', to: '/admin/batches', icon: Layers },
    { label: 'Approvals', to: '/admin/approvals', icon: CheckSquare },
    { label: 'Policies', to: '/admin/policies', icon: Settings },
    { label: 'Integrity', to: '/admin/integrity', icon: Shield },
    { label: 'Reports', to: '/admin/reports', icon: FileBarChart },
    { label: 'Support Desk', to: '/admin/support', icon: LifeBuoy },
    { label: 'Payments & Dues', to: '/admin/payments', icon: Wallet },
    { label: 'Moderation', to: '/admin/moderation', icon: Flag },
    { label: 'Audit Log', to: '/admin/audit-log', icon: ScrollText },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
    { label: 'Account', to: '/admin/account', icon: User },
  ],
}

export const ROLE_HOME = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  admin: '/admin/overview',
}

/** The single account destination per workspace. The shell footer links here
 *  instead of repeating a profile identity block in the header. */
export const ACCOUNT_PATH = {
  student: '/student/profile',
  faculty: '/faculty/account',
  admin: '/admin/account',
}

/** Resolves the active navigation entry, including nested detail routes. */
export function activeNavItem(role, pathname) {
  const items = NAV_ITEMS[role] || []
  return [...items]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
}

export const WORKSPACE_BASE = { student: '/student', faculty: '/faculty', admin: '/admin' }

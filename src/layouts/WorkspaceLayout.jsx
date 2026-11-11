import { Suspense, useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  User,
  X,
} from 'lucide-react'
import { Logo, Wordmark } from '../components/Icons.jsx'
import { ACCOUNT_PATH, NAV_ITEMS, ROLE_LABELS, activeNavItem } from '../lib/navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../ui/feedback.jsx'
import NotificationInbox from './NotificationInbox.jsx'
import CommandPalette from './CommandPalette.jsx'
import { RoleTag } from '../ui/account-identity.jsx'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'
import RouteFallback from '../ui/RouteFallback.jsx'

const COLLAPSE_KEY = 'vyuh:sidebar-collapsed'

export default function WorkspaceLayout() {
  const { role, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const [expanded, setExpanded] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) !== 'true'
    } catch {
      return true
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const items = NAV_ITEMS[role] || []
  const active = activeNavItem(role, location.pathname)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(!expanded))
    } catch {
      /* ignore */
    }
  }, [expanded])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      /* Navigation happens even if clearing storage failed, otherwise the user
         is stranded in a workspace they no longer have a session for. */
      toast.info('Signed out', 'Your demo session has been cleared.')
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }, [logout, navigate, toast])

  const navContent = (
    <>
      <div className={`flex items-center ${expanded ? 'justify-between' : 'justify-center'} px-3 pb-2 pt-4`}>
        <Link to="/" className="flex items-center gap-2.5" title="Vyuh home">
          <Logo className="h-8 w-8" />
          {expanded ? <Wordmark className="text-[19px]" /> : null}
        </Link>
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="hidden rounded-full p-1.5 text-soft transition hover:bg-[var(--surface-sunken)] hover:text-ink lg:block"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          <RoleTag role={role} size="xs" />
          <span className="truncate text-[9.5px] uppercase tracking-[0.14em] text-soft">workspace</span>
        </div>
      ) : null}

      {/* The demonstration card was removed: navigation now owns the full
          remaining height, with extra bottom breathing room before the footer. */}
      <nav aria-label={`${ROLE_LABELS[role]} navigation`} className="thin-scroll flex-1 overflow-y-auto px-2 pb-5 pt-1">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = active?.to === item.to
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={`group relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[13px] transition ${
                    isActive
                      ? 'bg-[var(--sky-100)] font-medium text-[var(--sky-900)] shadow-[inset_0_0_0_1px_var(--sky-200)]'
                      : 'text-ink-70 hover:bg-[var(--sky-50)] hover:text-[var(--sky-900)]'
                  } ${expanded ? '' : 'justify-center'}`}
                  title={expanded ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive ? (
                    <span className="absolute inset-y-[7px] left-0 w-[2.5px] rounded-full bg-[var(--sky-600)]" aria-hidden="true" />
                  ) : null}
                  <Icon className={`h-[16px] w-[16px] shrink-0 ${isActive ? 'text-[var(--sky-700)]' : 'text-ink-45 group-hover:text-[var(--sky-600)]'}`} aria-hidden="true" />
                  {expanded ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Account footer: no personal identity block. One link to the existing
          account page and one sign-out action, present in both sidebar states. */}
      <div className={`ws-sidebar-foot ${expanded ? '' : 'ws-sidebar-foot--compact'}`}>
        {expanded ? (
          <div className="ws-sidebar-foot-row">
            <NavLink to={ACCOUNT_PATH[role]} className="ws-sidebar-action" title="Open account settings">
              <User className="h-3.5 w-3.5" aria-hidden="true" /> Account
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="ws-sidebar-action ws-sidebar-action--signout"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="ws-sidebar-icon"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <NavLink to={ACCOUNT_PATH[role]} className="ws-sidebar-icon" aria-label="Open account settings" title="Account">
              <User className="h-4 w-4" />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="ws-sidebar-icon ws-sidebar-icon--signout"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="ws-root">
      <div className="ws-shell" data-expanded={expanded}>
        {/* desktop sidebar */}
        <aside className="ws-sidebar sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] lg:flex">
          {navContent}
        </aside>

        {/* mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <div className="absolute inset-0 bg-[rgba(20,22,24,0.4)] backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={reduceMotion ? false : { x: -24, opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
              className="ws-sidebar absolute inset-y-0 left-0 flex w-[268px] flex-col border-r border-[var(--line)]"
            >
              <div className="flex items-center justify-between px-4 pt-4">
                <Link to="/" className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <Wordmark className="text-[19px]" />
                </Link>
                <button type="button" className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Workspace context only — the personal identity card was removed
                  alongside the header block, and is not duplicated here. */}
              <div className="mx-4 mt-3 flex items-center gap-1.5">
                <RoleTag role={role} size="xs" />
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-soft">workspace</span>
              </div>
              <nav className="thin-scroll flex-1 overflow-y-auto px-2 py-3" aria-label={`${ROLE_LABELS[role]} navigation`}>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive = active?.to === item.to
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] ${
                            isActive ? 'bg-white font-medium text-ink' : 'text-ink-70'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="h-4 w-4 text-ink-45" aria-hidden="true" />
                          {item.label}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </nav>
              <div className="border-t border-[var(--line)] p-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm w-full"
                  disabled={loggingOut}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </motion.aside>
          </div>
        ) : null}

        <div className="ws-main">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(252,253,252,0.88)] backdrop-blur-md">
            <div className="flex h-[var(--header-height)] items-center gap-2 px-3 sm:px-4">
              <button
                type="button"
                className="icon-btn lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Header controls only. The workspace breadcrumb (role badge,
                  separator and current page title) and the profile identity
                  block were removed; account access and sign-out live in the
                  sidebar footer and mobile drawer. No replacement element or
                  empty spacer is rendered where the breadcrumb was. */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11.5px] text-soft transition hover:border-[var(--sky-300)] hover:bg-[var(--sky-50)] hover:text-[var(--sky-800)] sm:inline-flex"
                  aria-label="Open command search"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search
                  <kbd className="rounded border border-[var(--line)] px-1 text-[9.5px]">⌘K</kbd>
                </button>
                <button type="button" className="icon-btn sm:hidden" onClick={() => setPaletteOpen(true)} aria-label="Open command search">
                  <Search className="h-4 w-4" />
                </button>
                <NotificationInbox />
              </div>
            </div>
          </header>

          <main className="ws-canvas" id="main-content">
            {/* Each section is isolated: a render error shows a recoverable message
                instead of unmounting the shell and leaving a blank screen. */}
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* mobile bottom navigation: primary sections only, never the full desktop list */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(255,255,255,0.96)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Primary sections"
      >
        <ul className="flex items-stretch justify-between">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon
            const isActive = active?.to === item.to
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[9.5px] ${
                    isActive ? 'text-ink' : 'text-soft'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                  <span className="truncate px-0.5">{item.label.split(' ')[0]}</span>
                </NavLink>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex w-full flex-col items-center gap-0.5 py-2 text-[9.5px] text-soft"
              aria-label="Show all sections"
            >
              <Menu className="h-[17px] w-[17px]" aria-hidden="true" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export function BackLink({ to, label = 'Back' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[12px] text-muted transition hover:text-ink">
      <ChevronLeft className="h-3.5 w-3.5" /> {label}
    </Link>
  )
}

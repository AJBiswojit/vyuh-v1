import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  ArrowUpRight,
} from 'lucide-react'
import { Logo, Wordmark } from '../components/Icons.jsx'
import { NAV_ITEMS, ROLE_LABELS, ROLE_WORKSPACE, activeNavItem } from '../lib/navigation.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../ui/feedback.jsx'
import NotificationInbox from './NotificationInbox.jsx'
import CommandPalette from './CommandPalette.jsx'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'
import RouteFallback from '../ui/RouteFallback.jsx'

const COLLAPSE_KEY = 'vyuh:sidebar-collapsed'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Avatar({ name, tone = 'sky', size = 'md' }) {
  const toneClass =
    tone === 'cream'
      ? 'bg-[var(--cream-200)] text-[#6b5c33]'
      : tone === 'charcoal'
        ? 'bg-[var(--ink)] text-white'
        : 'bg-[var(--sky-300)] text-[#245268]'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${toneClass} ${
        size === 'lg' ? 'h-12 w-12 text-[15px]' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-[12px]'
      }`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export { Avatar }

export default function WorkspaceLayout() {
  const { role, user, logout } = useAuth()
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
  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    return segments.slice(1)
  }, [location.pathname])

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
        <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.16em] text-soft">{ROLE_WORKSPACE[role]}</p>
      ) : null}

      <nav aria-label={`${ROLE_LABELS[role]} navigation`} className="thin-scroll flex-1 overflow-y-auto px-2 pb-4">
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
                      ? 'bg-white font-medium text-ink shadow-[var(--shadow-xs)]'
                      : 'text-ink-70 hover:bg-white/70 hover:text-ink'
                  } ${expanded ? '' : 'justify-center'}`}
                  title={expanded ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive ? (
                    <span className="absolute inset-y-[7px] left-0 w-[2.5px] rounded-full bg-[var(--ink)]" aria-hidden="true" />
                  ) : null}
                  <Icon className={`h-[16px] w-[16px] shrink-0 ${isActive ? 'text-ink' : 'text-ink-45'}`} aria-hidden="true" />
                  {expanded ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {expanded ? (
        <div className="mx-3 mb-3 rounded-[14px] border border-[var(--line)] bg-white/70 p-3">
          <p className="text-[11px] font-medium text-ink">Frontend demonstration</p>
          <p className="mt-1 text-[10.5px] leading-snug text-muted">
            All records are local mock data. Camera and screen-share are local-only previews.
          </p>
          <Link to="/" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-link hover:underline">
            Public site <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      <div className={`border-t border-[var(--line)] p-2.5 ${expanded ? '' : 'flex justify-center'}`}>
        {expanded ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name} tone={user?.avatarTone} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink">{user?.name}</p>
              <p className="truncate text-[10.5px] text-soft">{ROLE_LABELS[role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full p-1.5 text-soft transition hover:bg-[var(--surface-sunken)] hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full p-1.5 text-soft transition hover:bg-white hover:text-ink"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  )

  return (
    <div className="ws-root">
      <div className="ws-shell" data-expanded={expanded}>
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[var(--surface-muted)] lg:flex">
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
              className="absolute inset-y-0 left-0 flex w-[268px] flex-col border-r border-[var(--line)] bg-[var(--surface-muted)]"
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
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(250,250,248,0.86)] backdrop-blur-md">
            <div className="flex h-[var(--header-height)] items-center gap-2 px-3 sm:px-4">
              <button
                type="button"
                className="icon-btn lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="hidden min-w-0 items-center gap-1.5 text-[12px] text-soft sm:flex">
                <span className="uppercase tracking-[0.14em]">{ROLE_LABELS[role]}</span>
                {active ? (
                  <>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    <span className="truncate font-medium text-ink">{active.label}</span>
                  </>
                ) : null}
                {crumbs.length > 1 ? (
                  <>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    <span className="truncate capitalize text-muted">{crumbs[crumbs.length - 1].replace(/-/g, ' ')}</span>
                  </>
                ) : null}
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11.5px] text-soft transition hover:border-[var(--line-strong)] hover:text-ink sm:inline-flex"
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
                <div className="ml-1 hidden items-center gap-2 border-l border-[var(--line)] pl-2.5 sm:flex">
                  <Avatar name={user?.name} tone={user?.avatarTone} size="sm" />
                  <div className="hidden min-w-0 leading-tight lg:block">
                    <p className="max-w-[150px] truncate text-[11.5px] font-medium text-ink">{user?.name}</p>
                    <p className="text-[10px] text-soft">{ROLE_LABELS[role]}</p>
                  </div>
                </div>
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

/* Global workspace-shell regression audit.

   Verifies the shared shell changes (demo card removal, header identity and
   breadcrumb removal, notification hierarchy) through the real DOM for Student,
   Faculty and Institute Admin, plus the ten functional regression checks.

   node tools/audit-workspace-shell.mjs */

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { readFileSync } from 'node:fs'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const key of [
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent',
  'InputEvent', 'localStorage', 'sessionStorage',
]) globalThis[key] = window[key]
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
})
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
Object.defineProperty(window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    getDisplayMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    enumerateDevices: () => Promise.resolve([]), addEventListener() {}, removeEventListener() {},
  },
})

const sink = { errors: [], uncaught: [] }
window.addEventListener('error', (event) => sink.uncaught.push(event.message))
window.addEventListener('unhandledrejection', (event) => sink.uncaught.push(String(event.reason?.message || event.reason)))
console.error = (...args) => {
  const text = args.map((arg) => (arg?.stack || String(arg))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future|Not implemented: (navigation to another Document|Window's print)/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
}
console.warn = () => {}
console.info = () => {}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (path) => server.ssrLoadModule(path)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService, getCurrentSession } = await load('/src/services/auth.service.js')
const { notificationService } = await load('/src/services/notification.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const { ACCOUNT_PATH, NAV_ITEMS, ROLE_LABELS, activeNavItem } = await load('/src/lib/navigation.js')

const cssText = readFileSync(new URL('../src/styles/workspace.css', import.meta.url), 'utf8')
const inboxSource = readFileSync(new URL('../src/layouts/NotificationInbox.jsx', import.meta.url), 'utf8')
const identitySource = readFileSync(new URL('../src/ui/account-identity.jsx', import.meta.url), 'utf8')
const layoutSource = readFileSync(new URL('../src/layouts/WorkspaceLayout.jsx', import.meta.url), 'utf8')
const layoutHeader = layoutSource.match(/<header[\s\S]*?<\/header>/)?.[0] || ''

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const HOME = { student: '/student/dashboard', faculty: '/faculty/dashboard', admin: '/admin/overview' }

const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = []
const step = (group, label, ok, detail = '') => {
  results.push({ group, label, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${group} — ${label}${detail ? ` (${detail})` : ''}`)
}
const cleanText = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim()
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (haystack, needle) => Boolean(needle) && new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(haystack)
const mainText = () => cleanText(rootEl.querySelector('main'))
const consoleClean = () => sink.errors.length === 0 && sink.uncaught.length === 0

async function mount(path, settle = 1700) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
  return mainText()
}

function click(selector, matcher) {
  const element = [...rootEl.querySelectorAll(selector)].find((node) => (matcher ? matcher(node) : true))
  if (!element) return false
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
}
const rows = () => [...rootEl.querySelectorAll('[data-notification-panel] a.notif-row')]
const openInbox = async () => {
  if (!rootEl.querySelector('[data-notification-panel]')) click('button[aria-haspopup="dialog"]')
  await sleep(500)
  return rootEl.querySelector('[data-notification-panel]')
}

/* States observed across all three roles; all four combinations must exist. */
const observedStates = new Set()
const recordStates = (list) => list.forEach((row) => observedStates.add(`${row.dataset.priority}:${row.dataset.read}`))

/* ------------------------------------------------------------ shared code */
step('shared', 'unused AccountIdentity component removed', !/export function AccountIdentity/.test(identitySource))
step('shared', 'notification UI reads the service, no hardcoded notification arrays',
  /notificationService\.listForUser/.test(inboxSource) && !/=\s*\[\s*\{\s*id:\s*'notif_/.test(inboxSource))
step('shared', 'stylesheet defines the four priority/read treatments',
  /\[data-priority='high'\]/.test(cssText) &&
  /\[data-priority='high'\]\[data-read='true'\]/.test(cssText) &&
  /\[data-priority='normal'\]\[data-read='false'\]/.test(cssText) &&
  /\[data-read='true'\] \.notif-title/.test(cssText) &&
  /--warn-50/.test(cssText) && /--sky-50/.test(cssText) && /--cream-50/.test(cssText))
step('shared', 'notification list scrolls independently',
  /\.notif-scroll\s*\{[^}]*overflow-y: auto/s.test(cssText) &&
  /overscroll-behavior: contain/.test(cssText) &&
  /@media \(max-width: 640px\)/.test(cssText))
step('shared', 'breadcrumb rendering logic removed from the shared header',
  !/useMemo/.test(layoutSource) &&
  !/ChevronRight/.test(layoutSource) &&
  !/crumbs/.test(layoutSource) &&
  !/active\?\.label|active\.label/.test(layoutSource) &&
  !/ROLE_LABELS|tracking-\[0\.14em\]|text-\[12px\] text-soft/.test(layoutHeader))

/* ------------------------------------------------------------- each role */
for (const role of ['student', 'faculty', 'admin']) {
  window.localStorage.clear()
  window.sessionStorage.clear()
  mockStorage.resetStore()
  const login = await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  const userId = login.user.id
  await mount(HOME[role])
  const group = role.toUpperCase()

  /* 1 — Frontend Demonstration card (scoped to the sidebar: the login
     screen and a few account pages legitimately still explain the demo). */
  const sidebar = rootEl.querySelector('aside')
  const asideText = cleanText(sidebar)
  step(group, '1. Frontend Demonstration card absent from sidebar',
    !/Frontend demonstration/i.test(asideText) &&
    !/All records are local mock data/i.test(asideText) &&
    !/Public site/i.test(asideText) &&
    ![...sidebar.querySelectorAll('a')].some((link) => /public site/i.test(cleanText(link))))

  /* 2 — header identity and the complete breadcrumb */
  const header = rootEl.querySelector('header')
  const headerText = cleanText(header)
  const headerIdentity = header?.querySelector('[data-identity], [data-identity-name], [data-identity-avatar]')
  const nameInHeader = login.user?.name ? headerText.includes(login.user.name) : false
  const activeLabel = activeNavItem(role, HOME[role])?.label || ''
  const lastSegment = HOME[role].split('/').filter(Boolean).pop().replace(/-/g, ' ')
  const breadcrumbSignals = [
    hasWord(headerText, ROLE_LABELS[role]) && 'role badge',
    hasWord(headerText, activeLabel) && 'current page title',
    hasWord(headerText, lastSegment) && 'crumb',
    header?.querySelector('svg[class*="chevron"]') && 'arrow',
    [...(header?.querySelectorAll('div') || [])].some((el) => {
      const cls = el.getAttribute('class') || ''
      return cls.includes('sm:flex') && cls.includes('text-soft') && cls.includes('text-[12px]')
    }) && 'breadcrumb container',
  ].filter(Boolean)
  const headerChildren = [...(header?.firstElementChild?.children || [])]
  const expectedStructure = headerChildren.length === 2 &&
    headerChildren[0].matches('button[aria-label="Open navigation"]') &&
    headerChildren[1].classList.contains('ml-auto')
  step(group, '2. no identity or breadcrumb in header; expected controls kept',
    !headerIdentity && !nameInHeader && breadcrumbSignals.length === 0 && expectedStructure &&
    header?.querySelectorAll('button[aria-label="Open command search"]').length === 2 &&
    Boolean(header?.querySelector('button[aria-haspopup="dialog"]')) &&
    Boolean(header?.querySelector('[data-unread-badge]')),
    `text="${headerText}", children=${headerChildren.length}`)

  const aside = rootEl.querySelector('aside')
  step(group, '2b. sidebar footer keeps account link + sign-out without identity',
    Boolean(aside?.querySelector('.ws-sidebar-foot')) &&
    Boolean(aside?.querySelector(`a[href="${ACCOUNT_PATH[role]}"]`)) &&
    Boolean(aside?.querySelector('button[aria-label="Sign out"]')) &&
    !aside?.querySelector('[data-identity]'))

  /* 5 — search and notification controls */
  click('button[aria-label="Open command search"]')
  await sleep(350)
  const palette = rootEl.querySelector('[role="dialog"][aria-label="Command search"]')
  step(group, '5a. command search opens', Boolean(palette) && Boolean(palette?.querySelector('input')))
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await sleep(250)

  const panel = await openInbox()
  const list = rows()
  step(group, '5b. notification panel has heading, unread count and mark-all action',
    /Notifications/.test(cleanText(panel?.querySelector('.notif-heading'))) &&
    Boolean(panel?.querySelector('[data-unread-count]')) &&
    Boolean(panel?.querySelector('[data-action="mark-all-read"]')) &&
    Boolean(panel?.querySelector('.notif-scroll')) &&
    list.length > 0)

  /* 6 — semantic hierarchy */
  const high = list.filter((row) => row.dataset.priority === 'high')
  const normal = list.filter((row) => row.dataset.priority === 'normal')
  const unreadRows = list.filter((row) => row.dataset.read === 'false')
  const readRows = list.filter((row) => row.dataset.read === 'true')
  recordStates(list)
  const priorityChips = high.length > 0 && high.every((row) => /Important/i.test(cleanText(row.querySelector('.notif-priority'))))
  const unreadDots = unreadRows.every((row) => row.querySelector('.notif-unread')) &&
    readRows.every((row) => !row.querySelector('.notif-unread'))
  const structural = list.every((row) => row.querySelector('.notif-icon svg') &&
    row.querySelector('.notif-title') && row.querySelector('.notif-body') && row.querySelector('time'))
  step(group, '6. priority / unread / read / category treatments present',
    high.length > 0 && normal.length > 0 && unreadRows.length > 0 && priorityChips && unreadDots &&
    structural && new Set(list.map((row) => row.dataset.category)).size > 1,
    `high=${high.length} normal=${normal.length} unread=${unreadRows.length} read=${readRows.length}`)

  /* 7 — mark all as read */
  click('[data-action="mark-all-read"]')
  await sleep(700)
  const afterPanel = rootEl.querySelector('[data-notification-panel]')
  const afterRows = rows()
  const serviceUnread = (await notificationService.listForUser(userId)).unreadCount
  step(group, '7. mark all as read updates rows, counter, badge and keeps priority',
    afterRows.length > 0 && afterRows.every((row) => row.dataset.read === 'true') &&
    afterPanel?.querySelector('[data-unread-count]')?.getAttribute('data-unread-count') === '0' &&
    Boolean(afterPanel?.querySelector('[data-action="mark-all-read"]')?.disabled) &&
    !rootEl.querySelector('[data-unread-badge]') &&
    afterRows.filter((row) => row.dataset.priority === 'high')
      .every((row) => /Important/i.test(cleanText(row.querySelector('.notif-priority')))) &&
    serviceUnread === 0)

  /* 8 — persistence through a fresh mount (refresh) */
  await mount(HOME[role])
  const persistedPanel = await openInbox()
  const persistedRows = rows()
  const stored = mockStorage.loadStore().notifications.filter((item) => item.userId === userId)
  step(group, '8. read state persists in service, store and a fresh mount',
    persistedRows.length > 0 && persistedRows.every((row) => row.dataset.read === 'true') &&
    persistedPanel?.querySelector('[data-unread-count]')?.getAttribute('data-unread-count') === '0' &&
    !rootEl.querySelector('[data-unread-badge]') &&
    stored.length > 0 && stored.every((item) => item.read === true))

  /* 9 — responsive shell */
  const mobileNav = rootEl.querySelector('nav[aria-label="Primary sections"]')
  const menu = [...rootEl.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Open navigation')
  let drawerLinks = 0
  let drawerIdentity = false
  if (menu) {
    menu.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(500)
    const drawer = rootEl.querySelector('.fixed.inset-0')
    drawerLinks = drawer?.querySelectorAll('nav a[href^="/"]').length || 0
    drawerIdentity = Boolean(drawer?.querySelector('[data-identity]'))
    const close = [...rootEl.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Close navigation')
    close?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(250)
  }
  step(group, '9. responsive shell (mobile bar, drawer, no duplicate identity)',
    Boolean(mobileNav) && Boolean(menu) && drawerLinks >= NAV_ITEMS[role].length - 1 && !drawerIdentity && consoleClean(),
    `drawerLinks=${drawerLinks}`)

  /* 3 — Profile / Account pages */
  const accountText = await mount(ACCOUNT_PATH[role])
  const accountMain = rootEl.querySelector('main')
  const accountNav = [...rootEl.querySelectorAll('aside a')].some((a) => a.getAttribute('href') === ACCOUNT_PATH[role])
  const editable = accountMain?.querySelectorAll('input, textarea, select').length || 0
  const save = [...(accountMain?.querySelectorAll('button') || [])].some((b) => /save changes/i.test(cleanText(b)))
  step(group, '3. Profile/Account page still works (heading, editing, identity, nav)',
    Boolean(accountMain?.querySelector('h1')) && editable > 0 && save &&
    Boolean(accountMain?.querySelector('[data-identity-avatar]')) && accountNav &&
    !/could not be loaded/i.test(accountText) && consoleClean(),
    `fields=${editable}`)

  /* 10 — direct URL + refresh on another section */
  const section = NAV_ITEMS[role][1].to
  const first = await mount(section)
  const refreshed = await mount(section)
  step(group, '10a. direct URL and refresh render the section',
    first.length > 80 && Math.abs(first.length - refreshed.length) < first.length * 0.5 &&
    Boolean(rootEl.querySelector('main h1')) && consoleClean())

  /* 4 — logout, including the collapsed sidebar */
  await mount(HOME[role])
  click('button[aria-label="Collapse sidebar"]')
  await sleep(250)
  const collapsedSignOut = Boolean(rootEl.querySelector('aside button[aria-label="Sign out"]'))
  click('aside button[aria-label="Sign out"]')
  await sleep(1400)
  const sessionGone = getCurrentSession() === null && window.localStorage.getItem('vyuh:session:v1') === null
  step(group, '4. logout works from collapsed sidebar and clears the session',
    collapsedSignOut && sessionGone && /Sign in|Institute email/i.test(cleanText(rootEl)))

  const blocked = await mount(HOME[role])
  step(group, '10b. route guard blocks the workspace after logout',
    /Sign in|Institute email/i.test(cleanText(rootEl)) && !/Examinations|Overview|Dashboard/i.test(blocked))
}

/* All four priority/read combinations must be visible somewhere in the app. */
step('shared', 'all four priority × read states are reachable',
  ['high:false', 'high:true', 'normal:false', 'normal:true'].every((state) => observedStates.has(state)),
  [...observedStates].sort().join(', '))

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (failed.length) {
  for (const result of failed) console.log(`  x ${result.group} — ${result.label} ${result.detail}`)
}
await server.close()
if (root) root.unmount()
process.exit(failed.length ? 1 : 0)

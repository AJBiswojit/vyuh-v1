/* Real-DOM audit harness for Vyuh.
   Boots the real App tree inside jsdom (React Router MemoryRouter) and checks,
   for every workspace route: render output, console errors, uncaught
   exceptions, heading presence, blank screens. Then clicks every sidebar link,
   simulates refresh (remount at the current URL), and exercises the auth flows.

   node tools/audit-routes.mjs [--role student|faculty|admin] [--verbose] */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const VERBOSE = process.argv.includes('--verbose')

/* ------------------------------ environment ------------------------------ */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
for (const key of [
  'window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent',
  'KeyboardEvent', 'FocusEvent', 'InputEvent', 'localStorage', 'sessionStorage', 'DOMParser',
]) {
  globalThis[key] = window[key] ?? window
}
globalThis.window = window
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noopObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
globalThis.ResizeObserver = window.ResizeObserver = noopObserver
globalThis.IntersectionObserver = window.IntersectionObserver = noopObserver
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false, media: '', onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  dispatchEvent() { return false },
})
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
if (!globalThis.navigator?.userAgent) {
  Object.defineProperty(globalThis, 'navigator', {
    value: window.navigator, configurable: true, writable: true,
  })
}

/* -------------------------------- capture -------------------------------- */
const sink = { errors: [], uncaught: [] }
window.addEventListener('error', (e) => sink.uncaught.push(`window.error: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => sink.uncaught.push(`unhandledrejection: ${e.reason?.message || e.reason}`))
process.on('unhandledRejection', (reason) => sink.uncaught.push(`process.unhandledRejection: ${reason?.message || reason}`))
const origError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a && a.stack ? a.stack : String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future Flag/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
  if (VERBOSE) origError(...args)
}
const origWarn = console.warn
console.warn = (...args) => {
  const text = args.map(String).join(' ')
  if (/each child in a list|validateDOMNesting|not wrapped in act/i.test(text)) return
  if (VERBOSE) origWarn(...args)
}
const origInfo = console.info
console.info = (...args) => { if (VERBOSE) origInfo(...args) }

/* --------------------------------- setup --------------------------------- */
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService, getCurrentSession, SESSION_STORAGE_KEY } = await load('/src/services/auth.service.js')
const { NAV_ITEMS } = await load('/src/lib/navigation.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const HOME = { student: '/student/dashboard', faculty: '/faculty/dashboard', admin: '/admin/overview' }

const EXPECT = {
  student: {
    '/student/dashboard': 'Dashboard',
    '/student/exams': 'Exams',
    '/student/live-classes': 'Live Classes',
    '/student/recordings': 'Recordings',
    '/student/performance': 'Performance',
    '/student/doubts': 'Doubts',
    '/student/attendance': 'Attendance',
    '/student/payment-dues': 'Payment & Dues',
    '/student/profile': 'Profile',
    '/student/support': 'Support',
    '/student/exams/exam_phy_001/instructions': 'Instructions',
    '/student/exams/exam_phy_001/result': 'Result',
    '/student/exams/exam_phy_001/analysis': 'Analysis',
    '/student/live-classes/class_001': 'Class',
    '/student/recordings/rec_001': 'Recording',
  },
  faculty: {
    '/faculty/dashboard': 'Faculty workspace',
    '/faculty/question-bank': 'Question Bank',
    '/faculty/exams': 'Examinations',
    '/faculty/item-analysis': 'Item Analysis',
    '/faculty/classes': 'Classes',
    '/faculty/recordings': 'Recordings',
    '/faculty/attendance': 'Attendance',
    '/faculty/doubts': 'Doubts',
    '/faculty/support': 'Support',
    '/faculty/account': 'Account',
    '/faculty/exams/new': 'Exam',
    '/faculty/exams/exam_phy_001': 'Exam',
    '/faculty/classes/class_001/studio': 'Class',
  },
  admin: {
    '/admin/overview': 'Overview',
    '/admin/users': 'Users',
    '/admin/batches': 'Batches',
    '/admin/approvals': 'Approvals',
    '/admin/policies': 'Policies',
    '/admin/integrity': 'Integrity',
    '/admin/reports': 'Reports',
    '/admin/support': 'Support Desk',
    '/admin/payments': 'Payments & Dues',
    '/admin/moderation': 'Moderation',
    '/admin/audit-log': 'Audit Log',
    '/admin/settings': 'Settings',
    '/admin/account': 'Account',
  },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rootEl = window.document.getElementById('root')
let root = null
const currentPath = { value: '/' }

async function mount(path, { settle = 1600 } = {}) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  currentPath.value = path
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
  return rootEl.textContent || ''
}

async function signIn(role) {
  window.localStorage.clear()
  const result = await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  return result
}

const text = (node = rootEl) => (node.textContent || '').replace(/\s+/g, ' ').trim()
const hasMain = () => Boolean(rootEl.querySelector('main'))
const mainText = () => text(rootEl.querySelector('main') || rootEl)
/* Studio/classroom pages intentionally have no PageHeader (full-bleed surface),
   so they are checked separately. */
const isStudioRoute = (path) => /\/(studio|room)$/.test(path)

/* ------------------------------- reporting ------------------------------- */
const problems = []
function check(label, ok, detail = '') {
  if (!ok) problems.push({ label, detail })
  return ok
}

/* ============================== 1. routes ============================== */
const roles = process.argv.includes('--role') ? [process.argv[process.argv.indexOf('--role') + 1]] : ['student', 'faculty', 'admin']

for (const role of roles) {
  for (const [path, heading] of Object.entries(EXPECT[role])) {
    await signIn(role)
    const body = await mount(path)
    const main = mainText()
    const blank = main.trim().length < 30 || !hasMain()
    const errors = [...new Set(sink.errors)]
    const uncaught = [...new Set(sink.uncaught)]
    const headingOk = isStudioRoute(path) ? /LIVE|Chat|People|Polls/i.test(main) : main.toLowerCase().includes(heading.toLowerCase())
    check(`route ${path}`, !blank && headingOk && !errors.length && !uncaught.length,
      [blank && `BLANK (${main.trim().length} chars)`, !blank && !headingOk && `expected heading "${heading}"`,
        errors[0] && `console.error: ${errors[0]}`, uncaught[0] && `uncaught: ${uncaught[0]}`,
        `| saw: ${text().slice(0, 70)}`].filter(Boolean).join(' · '))
  }
}

/* ======================= 2. sidebar link navigation ======================= */
async function clickNav(role, expectedPath) {
  const links = [...rootEl.querySelectorAll(`nav a[href^="/${role}/"], aside a[href^="/${role}/"]`)]
  const link = links.find((a) => a.getAttribute('href') === expectedPath)
  if (!link) return { missing: true, available: links.map((a) => a.getAttribute('href')) }
  link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  await sleep(1500)
  return { ok: true, heading: mainText().slice(0, 60), errors: [...new Set(sink.errors)] }
}

for (const role of roles) {
  await signIn(role)
  await mount(HOME[role])
  for (const item of NAV_ITEMS[role]) {
    const key = `${role} sidebar → ${item.to}`
    /* navigate away first so every click is a real transition */
    const other = NAV_ITEMS[role].find((n) => n.to !== item.to)
    await mount(other.to, { settle: 1200 })
    const result = await clickNav(role, item.to)
    if (result.missing) {
      check(key, false, `sidebar has no link to ${item.to}; links: ${result.available.join(', ')}`)
      continue
    }
    const expected = EXPECT[role][item.to] || item.label
    check(key, mainText().toLowerCase().includes(expected.toLowerCase()) && !result.errors.length,
      [expected && !mainText().toLowerCase().includes(expected.toLowerCase()) && `expected "${expected}"`, `saw: ${result.heading}`,
        result.errors[0]].filter(Boolean).join(' · '))
  }
}

/* ===================== 3. refresh on every route (SSR-ish) ===================== */
for (const role of roles) {
  for (const path of Object.keys(EXPECT[role])) {
    await signIn(role)
    await mount(path, { settle: 1400 })
    await mount(path, { settle: 1400 }) // remount = hard refresh, storage intact
    check(`refresh ${path}`, mainText().trim().length > 30 && !sink.errors.length && !sink.uncaught.length,
      `after refresh: ${mainText().slice(0, 60)}`)
  }
}

/* ========================= 4. auth flow behaviours ========================= */
{
  /* login → workspace for each role */
  for (const role of ['student', 'faculty', 'admin']) {
    const result = await signIn(role)
    check(`login ${role} redirect`, result.redirectTo === HOME[role], `redirectTo=${result.redirectTo}`)
    check(`session ${role}`, getCurrentSession()?.role === role, `session=${JSON.stringify(getCurrentSession()?.role)}`)
  }

  /* logout clears the session and the guard blocks the workspace */
  await signIn('admin')
  await authService.logout()
  check('logout clears session', getCurrentSession() === null && !window.localStorage.getItem(SESSION_STORAGE_KEY))
  const afterLogout = await mount('/admin/overview', { settle: 2500 })
  check('workspace blocked after logout', /institute email|Sign in/i.test(text()) && !afterLogout.includes('Overview'), text().slice(0, 80))

  /* repeated login/logout cycles must not leak or loop */
  for (let i = 0; i < 3; i += 1) {
    const role = ['student', 'faculty', 'admin'][i]
    await signIn(role)
    const body = await mount(HOME[role], { settle: 1400 })
    const ok = mainText().toLowerCase().includes(EXPECT[role][HOME[role]].toLowerCase())
    check(`login/logout cycle ${i + 1} (${role})`, ok, text().slice(0, 70))
    await authService.logout()
  }

  /* deactivated user cannot keep a restored session */
  await signIn('student')
  const mockStorage = await load('/src/data/mock/mock-storage.js')
  const store = mockStorage.loadStore ? mockStorage.loadStore() : null
  if (store) {
    const target = store.users.find((u) => u.email === EMAIL.student)
    const restore = target.status
    target.status = 'inactive'
    mockStorage.saveStore?.()
    check('inactive user session rejected', getCurrentSession() === null, `getCurrentSession role=${getCurrentSession()?.role}`)
    target.status = restore
    mockStorage.saveStore?.()
  }

  /* corrupted session payload must not white-screen the app */
  window.localStorage.setItem(SESSION_STORAGE_KEY, '{not json')
  const corrupt = await mount('/admin/overview')
  check('corrupted session handled', /Sign in/i.test(corrupt), text().slice(0, 80))
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: 'ghost', issuedAt: new Date().toISOString() }))
  const ghost = await mount('/student/dashboard')
  check('unknown userId handled', /Sign in/i.test(ghost), text().slice(0, 80))

  /* trailing slash / index redirects */
  await signIn('faculty')
  const noSlash = await mount('/faculty')
  check('/faculty index redirect', mainText().toLowerCase().includes('faculty workspace'), text().slice(0, 70))
  const withSlash = await mount('/faculty/')
  check('/faculty/ index redirect', mainText().toLowerCase().includes('faculty workspace'), text().slice(0, 70))
  const unknownNested = await mount('/faculty/not-a-section')
  check('/faculty/unknown handled', mainText().toLowerCase().includes('faculty workspace') || /not found/i.test(text()), text().slice(0, 70))

  /* cross-role access */
  for (const [role, target] of [['student', '/admin/overview'], ['faculty', '/admin/users'], ['admin', '/student/dashboard'], ['faculty', '/student/exams']]) {
    await signIn(role)
    const body = await mount(target, { settle: 1200 })
    check(`cross-role ${role} → ${target}`, /not yours|do not have access|Forbidden/i.test(body), text().slice(0, 70))
  }

  /* anonymous, unknown, and app entry */
  window.localStorage.clear()
  const anon = await mount('/admin/overview')
  check('anonymous → sign in', /institute email|Sign in/i.test(anon), text().slice(0, 70))
  const nf = await mount('/nope/nope')
  check('unknown route → 404', /Page not found/i.test(nf), text().slice(0, 70))
  const app = await mount('/app')
  check('/app anonymous → sign in', /institute email|Sign in/i.test(app), text().slice(0, 70))
}

/* --------------------------------- output --------------------------------- */
if (root) root.unmount()
await server.close()

const byRole = (label) => {
  const match = label.match(/^(?:route|refresh) \/(\w+)\//)
  return match ? match[1] : null
}
let currentGroup = ''
const groups = new Map()
for (const p of problems) {
  const role = byRole(p.label) || 'auth & guards'
  if (!groups.has(role)) groups.set(role, [])
  groups.get(role).push(p)
}
for (const role of ['student', 'faculty', 'admin', 'auth & guards']) {
  const list = groups.get(role)
  if (!list) continue
  console.log(`\n── ${role.toUpperCase()} ── ${list.length} problem(s)`)
  for (const p of list) console.log(`  ✗ ${p.label}\n      ${p.detail}`)
}
console.log(`\n${problems.length === 0 ? 'ALL CLEAR' : `${problems.length} PROBLEM(S)`}\n`)
process.exit(problems.length ? 1 : 0)

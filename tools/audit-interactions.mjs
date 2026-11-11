/* Click-through audit: every interactive button on every workspace page.
   For each page we remount fresh, click one button, and assert that the app
   neither crashes (blank screen) nor logs an error. Also counts service calls
   per mount to catch duplicated fetches.

   node tools/audit-interactions.mjs --role student|faculty|admin [--max N] */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const ROLE = arg('role', 'student')
const MAX = Number(arg('max', 14))

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'InputEvent', 'localStorage', 'sessionStorage']) {
  globalThis[k] = window[k]
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noopR = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noopR
globalThis.IntersectionObserver = window.IntersectionObserver = noopR
globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
globalThis.scrollTo = window.scrollTo = () => {}
window.scrollTo = globalThis.scrollTo
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
/* Camera/mic are real browser APIs; jsdom has none. Reject the way a denied
   browser permission does, so the app's honest fallback path is exercised. */
Object.defineProperty(window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    getDisplayMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    enumerateDevices: () => Promise.resolve([]),
    addEventListener() {}, removeEventListener() {},
  },
})

const sink = { errors: [], uncaught: [] }
window.addEventListener('error', (e) => sink.uncaught.push(e.message))
window.addEventListener('unhandledrejection', (e) => sink.uncaught.push(String(e.reason?.message || e.reason)))
const origError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a && a.stack ? a.stack : String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future/i.test(text)) return
  /* jsdom cannot follow a download/navigation to another document — that is a
     harness limitation, not an app error. */
  if (/Not implemented: (navigation to another Document|Window's print)/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
}
console.warn = (...args) => {
  if (process.env.VERBOSE) origError(...args)
}
console.info = () => {}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const { NAV_ITEMS } = await load('/src/lib/navigation.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}

/* A page mounted inside the shell: measure how many service calls one mount makes. */
const counts = new Map()
for (const path of ['admin.service', 'user.service', 'batch.service', 'exam.service', 'attempt.service',
  'attendance.service', 'live-class.service', 'repository', 'support.service', 'doubt.service',
  'recording.service', 'performance.service', 'analysis.service', 'question.service', 'notification.service']) {
  let mod
  try { mod = await load(`/src/services/${path}.js`) } catch { continue }
  for (const exported of Object.values(mod)) {
    if (!exported || typeof exported !== 'object') continue
    for (const [key, fn] of Object.entries(exported)) {
      if (typeof fn !== 'function') continue
      const label = `${path}.${key}`
      exported[key] = (...args) => {
        counts.set(currentLabel, (counts.get(currentLabel) || 0) + 1)
        return fn(...args)
      }
    }
  }
}

const rootEl = window.document.getElementById('root')
let root = null
let currentLabel = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const bodyText = () => (rootEl.querySelector('main')?.textContent || rootEl.textContent || '').replace(/\s+/g, ' ').trim()

async function mount(path) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(1500)
  return bodyText()
}

await authService.login({ email: EMAIL[ROLE], password: authService.demoPassword() })

const pages = NAV_ITEMS[ROLE].map((item) => item.to)
const problems = []
const fetchStats = []

for (const path of pages) {
  currentLabel = path
  counts.delete(path)
  const before = await mount(path)
  const calls = counts.get(path) || 0
  fetchStats.push({ path, calls })

  const labels = [...rootEl.querySelectorAll('main button, main [role="tab"], main [aria-pressed]')]
    .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter((label) => label && label.length < 40)
  /* de-duplicate identical labels, keep order */
  const unique = [...new Set(labels)].slice(0, MAX)

  for (const label of unique) {
    await mount(path)
    const target = [...rootEl.querySelectorAll('main button, main [role="tab"], main [aria-pressed]')]
      .find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim() === label)
    if (!target) continue
    target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(1100)
    const after = bodyText()
    const errors = [...new Set(sink.errors)]
    const uncaught = [...new Set(sink.uncaught)]
    const blank = after.length < 40
    const pageLost = /Page not found/.test(after) || /This section could not be displayed/.test(after)
    if (blank || errors.length || uncaught.length || pageLost) {
      problems.push({
        path, label, blank, pageLost,
        detail: [blank && `blank (${after.length} chars)`, pageLost && 'fell into error/404 state',
          errors[0] && `console.error: ${errors[0]}`, uncaught[0] && `uncaught: ${uncaught[0]}`].filter(Boolean).join(' · '),
        saw: after.slice(0, 70),
      })
    }
    mockStorage.resetStore?.()
  }
  console.log(`· ${path} — ${unique.length} controls, ${calls} service calls on first paint`)
}

if (root) root.unmount()
await server.close()

if (fetchStats.some((s) => s.calls === 0)) {
  for (const s of fetchStats.filter((x) => x.calls === 0)) problems.push({ path: s.path, label: 'initial data', detail: 'no service call detected on mount (page may not load data)' })
}
const heavy = fetchStats.filter((s) => s.calls > 6)
for (const h of heavy) console.log(`! ${h.path} performs ${h.calls} service calls per mount`)

console.log(`\n════ ${ROLE.toUpperCase()} INTERACTION AUDIT ════`)
for (const p of problems) {
  console.log(`  ✗ ${p.path} → "${p.label}"\n      ${p.detail}\n      saw: ${p.saw}`)
}
console.log(`\n${problems.length === 0 ? 'ALL CLEAR' : `${problems.length} PROBLEM(S)`}\n`)
process.exit(problems.length ? 1 : 0)

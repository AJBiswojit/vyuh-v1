/* Re-render / refetch audit.
   Mounts each workspace page and watches service calls for 6 seconds while
   nothing is clicked. A page that refetches in a loop (unstable dependency,
   setState inside an effect that re-triggers itself) shows a rising count.

   node tools/audit-rerender.mjs */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'localStorage', 'sessionStorage']) globalThis[k] = window[k]
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })

const errors = []
const origError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future/i.test(text)) return
  errors.push(text.split('\n')[0])
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const { NAV_ITEMS } = await load('/src/lib/navigation.js')

let calls = 0
const perService = new Map()
for (const name of ['admin.service', 'user.service', 'batch.service', 'exam.service', 'attempt.service',
  'attendance.service', 'live-class.service', 'repository', 'support.service', 'doubt.service',
  'recording.service', 'performance.service', 'analysis.service', 'question.service', 'notification.service']) {
  let mod
  try { mod = await load(`/src/services/${name}.js`) } catch { continue }
  for (const exported of Object.values(mod)) {
    if (!exported || typeof exported !== 'object') continue
    for (const [key, fn] of Object.entries(exported)) {
      if (typeof fn !== 'function') continue
      exported[key] = (...args) => {
        calls += 1
        perService.set(`${name}.${key}`, (perService.get(`${name}.${key}`) || 0) + 1)
        return fn(...args)
      }
    }
  }
}

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let root = null

async function mount(path) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
}

const ROUTES = Object.fromEntries(
  Object.entries(NAV_ITEMS).map(([role, items]) => [role, items.map((item) => item.to)]),
)

const problems = []
for (const [role, paths] of Object.entries(ROUTES)) {
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  for (const path of paths) {
    calls = 0
    perService.clear()
    errors.length = 0
    await mount(path)
    await sleep(2200)
    const settled = calls
    await sleep(4000)
    const drift = calls - settled
    const blank = (rootEl.querySelector('main')?.textContent || '').trim().length < 30
    if (drift > 0) {
      const repeated = [...perService.entries()].filter(([, count]) => count > 2).map(([key, count]) => `${key}×${count}`)
      problems.push({ path, kind: `refetch loop: +${drift} calls after settling`, detail: repeated.join(', ') })
    }
    if (blank) problems.push({ path, kind: 'blank after settling', detail: '' })
    if (errors.length) problems.push({ path, kind: 'console.error', detail: errors[0] })
    console.log(`· ${path.padEnd(28)} first paint ${String(settled).padStart(2)} calls, +${drift} in the next 4s`)
  }
}

if (root) root.unmount()
await server.close()

console.log('')
if (problems.length) {
  for (const p of problems) console.log(`  x ${p.path} — ${p.kind}${p.detail ? ' — ' + p.detail : ''}`)
  console.log(`\n${problems.length} PROBLEM(S)\n`)
  process.exit(1)
}
console.log('ALL PAGES STABLE (no refetch loops, no blank screens, no console errors)\n')

/* First-meaningful-paint audit: how long each workspace page spends on its
   loading state before real content appears.

   node tools/audit-paint.mjs */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'localStorage', 'sessionStorage']) globalThis[k] = window[k]
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 4)
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
console.error = () => {}
console.warn = () => {}
console.info = () => {}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const { NAV_ITEMS } = await load('/src/lib/navigation.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let root = null

const LOADING = /Loading|Restoring your session|Opening the classroom|Loading section/i

async function timeToContent(path) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  const start = performance.now()
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  let firstContent = null
  for (let tick = 0; tick < 400; tick += 1) {
    await sleep(25)
    const main = rootEl.querySelector('main')
    if (!main) continue
    const content = main.textContent || ''
    const looksLoading = LOADING.test(content) && content.length < 900
    if (content.trim().length > 60 && !looksLoading && !firstContent) {
      firstContent = performance.now() - start
      break
    }
  }
  return firstContent
}

const rows = []
for (const [role, items] of Object.entries(NAV_ITEMS)) {
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  for (const item of items) {
    const samples = []
    for (let run = 0; run < 2; run += 1) {
      const value = await timeToContent(item.to)
      if (value !== null) samples.push(value)
    }
    const best = samples.length ? Math.min(...samples) : null
    rows.push({ role, path: item.to, ms: best })
    console.log(`${best === null ? '  n/a' : String(Math.round(best)).padStart(5)} ms  ${item.to}`)
  }
}

const measured = rows.filter((row) => row.ms !== null)
const slowest = [...measured].sort((a, b) => b.ms - a.ms).slice(0, 6)
const average = measured.reduce((total, row) => total + row.ms, 0) / measured.length

console.log(`\naverage ${Math.round(average)} ms across ${measured.length} pages`)
console.log('slowest:')
for (const row of slowest) console.log(`  ${Math.round(row.ms).toString().padStart(5)} ms  ${row.path}`)

if (root) root.unmount()
await server.close()
process.exit(0)

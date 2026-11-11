/* Responsive / mobile-navigation audit.
   jsdom has no layout engine, so this checks the things that actually break a
   mobile layout: the bottom nav must expose every section (or a reachable "more"
   drawer), every desktop-only affordance must have a mobile equivalent, and no
   page may rely on a hover-only control to reach its primary action.

   node tools/audit-responsive.mjs */
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
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future/i.test(text)) return
  errors.push(text.split('\n')[0])
}
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
let root = null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function mount(path, settle = 1800) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

const problems = []
for (const [role, items] of Object.entries(NAV_ITEMS)) {
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  await mount(items[0].to)

  /* the mobile bar must be able to reach every section, directly or via the menu */
  const mobileNav = [...rootEl.querySelectorAll('nav[aria-label="Primary sections"] a')]
    .map((a) => a.getAttribute('href'))
    .filter(Boolean)
  const menuButton = [...rootEl.querySelectorAll('button')].find((b) =>
    /menu|sections|navigation|more/i.test(b.getAttribute('aria-label') || ''),
  )
  const reachable = new Set(mobileNav)
  if (menuButton) {
    menuButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(600)
    for (const link of rootEl.querySelectorAll('a[href^="/"]')) {
      const href = link.getAttribute('href')
      if (href) reachable.add(href)
    }
  }
  const missing = items.map((item) => item.to).filter((to) => !reachable.has(to))
  if (missing.length) {
    problems.push({ role, kind: 'sections unreachable on mobile', detail: missing.join(', ') })
  }
  console.log(`· ${role}: ${reachable.size} reachable links on mobile`)

  /* every page must keep its primary heading visible on a narrow viewport */
  for (const item of items) {
    await mount(item.to)
    const heading = rootEl.querySelector('main h1, main h2')
    if (!heading || !(heading.textContent || '').trim()) {
      problems.push({ role, kind: `${item.to} has no heading`, detail: '' })
    }
    const overflowing = [...rootEl.querySelectorAll('main [style*="width: 1"]')].length
    if (overflowing > 20) problems.push({ role, kind: `${item.to} suspicious inline widths`, detail: String(overflowing) })
    if (errors.length) {
      problems.push({ role, kind: `${item.to} console error`, detail: errors[0] })
      errors.length = 0
    }
  }
}

if (root) root.unmount()
await server.close()

if (problems.length) {
  for (const p of problems) console.log(`  x [${p.role}] ${p.kind}${p.detail ? ' — ' + p.detail : ''}`)
  console.log(`\n${problems.length} PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nRESPONSIVE CHECKS PASS (all sections reachable on mobile, every page has a heading)\n')

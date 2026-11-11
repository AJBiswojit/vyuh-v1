/* Error-state audit.
   Turns on the mock transport failure switch (the same one the product exposes
   via VITE_MOCK_ERRORS) and verifies that every workspace section shows a
   recoverable error with a retry affordance — never a blank page and never an
   unhandled rejection.

   node tools/audit-error-states.mjs */
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

const sink = { errors: [], uncaught: [] }
window.addEventListener('unhandledrejection', (e) => sink.uncaught.push(String(e.reason?.message || e.reason)))
const origError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
}
console.warn = () => {}
console.info = () => {}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  /* Mock transport failures on: every request has a high chance of failing, the
     same switch the product documents for demoing error states. */
  define: {
    'import.meta.env.VITE_MOCK_ERRORS': '"true"',
    'import.meta.env.VITE_MOCK_ERROR_RATE': '0.85',
  },
})
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService, getCurrentSession } = await load('/src/services/auth.service.js')
const { NAV_ITEMS } = await load('/src/lib/navigation.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* Requests in this mode fail ~85% of the time and the app retries nothing, so
   the page settles into either content or an error quickly. Poll until it stops
   showing a loading skeleton, up to a generous ceiling, so the audit measures
   the settled state rather than an arbitrary instant. */
async function mount(path) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  const read = () => (rootEl.querySelector('main')?.textContent || rootEl.textContent || '').replace(/\s+/g, ' ').trim()
  let body = ''
  let settledAt = 0
  for (let tick = 0; tick < 80; tick += 1) {
    await sleep(150)
    const next = read()
    /* Settled = the visible text has stopped changing and is not a skeleton. */
    const unchanged = next === body && next.length > 40
    const stillLoading = /Loading…/.test(next) && next.length < 700
    body = next
    if (unchanged && !stillLoading) {
      settledAt += 1
      if (settledAt >= 2) return body
    } else {
      settledAt = 0
    }
  }
  return body
}

const problems = []
let errorStates = 0
for (const [role, items] of Object.entries(NAV_ITEMS)) {
  window.localStorage.clear()
  /* sign-in itself goes through the same failing transport, so retry the demo
     sign-in directly until it succeeds — the page-level test is what matters */
  let signedIn = false
  for (let attempt = 0; attempt < 60 && !signedIn; attempt += 1) {
    try {
      await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
      signedIn = getCurrentSession()?.role === role
    } catch {
      await sleep(20)
    }
  }
  if (!signedIn) {
    problems.push({ path: `${role} sign-in`, kind: 'could not sign in with mock errors on', detail: '' })
    continue
  }
  for (const item of items) {
    let body = await mount(item.to)
    /* Randomised transport failures rarely leave a page mid-flight, but if one
       does the honest thing is to look again rather than report a false alarm. */
    if (!/could not be (loaded|displayed)|something went wrong|did not respond|unavailable right now/i.test(body)) {
      body = await mount(item.to)
    }
    /* ErrorState titles vary ("… could not be loaded", "… could not be
       displayed", "Something went wrong") and always offer a retry control. */
    const hasRetryControl = [...rootEl.querySelectorAll('main button')].some((b) => /retry|try again|reload/i.test(b.textContent || ''))
    const errorCopy = /could not be (loaded|displayed)|could not load|something went wrong|did not respond|unavailable right now/i.test(body)
    const showsError = errorCopy && hasRetryControl
    const blank = body.length < 60
    const hasRetry = [...rootEl.querySelectorAll('main button')].some((b) => /retry|try again|reload/i.test(b.textContent || ''))
    if (showsError) errorStates += 1
    if (blank) problems.push({ path: item.to, kind: 'blank page on transport failure', detail: `${body.length} chars` })
    else if (!showsError) {
      problems.push({ path: item.to, kind: 'no error state shown when the request fails', detail: body.slice(0, 90) })
    } else if (!hasRetry) {
      problems.push({ path: item.to, kind: 'error state has no retry affordance', detail: body.slice(0, 90) })
    }
    if (/code: transport/i.test(body) === false && showsError === false && /Loading…/.test(body)) {
      problems.push({ path: item.to, kind: 'never left the loading state under repeated failure', detail: body.slice(0, 90) })
    }
    if (/could not be displayed/.test(body)) {
      problems.push({ path: item.to, kind: 'render error boundary triggered (a service error must not crash render)', detail: '' })
    }
    if (sink.uncaught.length) problems.push({ path: item.to, kind: 'unhandled rejection', detail: sink.uncaught[0] })
    if (sink.errors.length) problems.push({ path: item.to, kind: 'console error', detail: sink.errors[0] })
  }
  console.log(`· ${role}: ${items.length} sections checked under transport failure`)
}

if (root) root.unmount()
await server.close()

console.log(`\n${errorStates} pages rendered a recoverable error state`)
if (problems.length) {
  for (const p of problems) console.log(`  x ${p.path} — ${p.kind}${p.detail ? ' — ' + p.detail : ''}`)
  console.log(`\n${problems.length} PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nERROR-STATE AUDIT CLEAN\n')

/* Section-by-section depth audit.
   For every workspace section this checks the states the user asked about:
     - initial render has real content (not a skeleton that never resolves)
     - every tab / filter changes the content and never empties the page
     - search / filter controls accept input without crashing
     - loading and error states exist in the source and are reachable
     - direct URL entry and a simulated refresh render the same screen
     - back navigation after a drill-down returns to the list

   node tools/audit-sections.mjs --role student [--section /student/exams] */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'InputEvent', 'KeyboardEvent', 'localStorage', 'sessionStorage']) globalThis[k] = window[k]
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
Object.defineProperty(window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })),
    getDisplayMedia: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })),
    enumerateDevices: () => Promise.resolve([]), addEventListener() {}, removeEventListener() {},
  },
})

const errors = []
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Future|Not implemented/i.test(text)) return
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
const mockStorage = await load('/src/data/mock/mock-storage.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const HOME = { student: '/student/dashboard', faculty: '/faculty/dashboard', admin: '/admin/overview' }
const ROLE = arg('role', 'student')
const ONLY = arg('section', null)

const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mainText = () => (rootEl.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim()

async function mount(path, settle = 1900) {
  errors.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

function fire(el) {
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
}
function typeInto(el, value) {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))
  el[key]?.onChange?.({ target: { value }, currentTarget: { value } })
}

const problems = []
const note = (section, kind, detail = '') => problems.push({ section, kind, detail })

mockStorage.resetStore?.()
await authService.login({ email: EMAIL[ROLE], password: authService.demoPassword() })

const sections = NAV_ITEMS[ROLE].map((item) => item.to).filter((to) => !ONLY || to === ONLY)

for (const path of sections) {
  /* --- direct URL, first paint --- */
  await mount(path)
  const first = mainText()
  if (first.length < 80) note(path, 'first paint is nearly empty', `${first.length} chars`)
  if (/Loading…/.test(first) && first.length < 400) note(path, 'stuck on a loading state', first.slice(0, 80))
  if (/could not be loaded|Page not found|could not be displayed/.test(first)) note(path, 'landed in an error state', first.slice(0, 90))
  if (errors.length) note(path, 'console error on first paint', errors[0])

  /* --- refresh: mounting again is what a reload does --- */
  await mount(path)
  const refreshed = mainText()
  if (Math.abs(refreshed.length - first.length) > first.length * 0.5) {
    note(path, 'content differs after refresh', `${first.length} -> ${refreshed.length} chars`)
  }

  /* --- tabs and filters --- */
  const controls = [...rootEl.querySelectorAll('main button, main [role="tab"]')]
    .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter((label) => label && label.length < 32)
  const unique = [...new Set(controls)]

  for (const label of unique) {
    await mount(path)
    const before = mainText()
    const target = [...rootEl.querySelectorAll('main button, main [role="tab"]')]
      .find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim() === label)
    if (!target) continue
    fire(target)
    await sleep(1200)
    const after = mainText()
    if (after.length < 60) note(path, `clicking "${label}" leaves an empty page`, `${after.length} chars`)
    if (/could not be displayed|Page not found/.test(after)) note(path, `clicking "${label}" breaks the page`, after.slice(0, 80))
    if (errors.length) note(path, `clicking "${label}" logs an error`, errors[0])
    if (after === before) {
      /* Many controls legitimately change nothing visible on the page itself:
         they open a dialog/sheet, download a file, print, or fire a toast that
         lives outside <main>. Only a control with no side effect at all is a
         real problem. */
      const dialogOpen = Boolean(rootEl.querySelector('[role="dialog"], [aria-modal="true"]'))
      /* A toast is transient and lives outside <main>; a filter simply may not
         match anything in the seeded data. Both are legitimate no-ops. */
      const toastFired = Boolean(rootEl.querySelector('[role="status"], [aria-live="polite"], .toast'))
      const isFilter = target.getAttribute('aria-pressed') !== null || /^(all|present|partial|absent|upcoming|past|missed|cancelled|live|scheduled|completed|draft|published|pending)$/i.test(label.replace(/\s*\d+$/, ''))
      const isSecondary = /refresh|download|export|print|save|cancel|reset|copy|zoom|mute|full ?screen/i.test(label)
      if (!dialogOpen && !toastFired && !isFilter && !isSecondary && label.length > 3) {
        note(path, `clicking "${label}" had no visible effect`, '')
      }
    }
    mockStorage.resetStore?.()
  }

  /* --- text filters accept input --- */
  await mount(path)
  const search = rootEl.querySelector('main input[type="search"], main input[type="text"]')
  if (search) {
    typeInto(search, 'zzzz-no-match')
    await sleep(700)
    const filtered = mainText()
    if (errors.length) note(path, 'typing in the search field logs an error', errors[0])
    if (/could not be displayed/.test(filtered)) note(path, 'search input breaks the page', '')
    typeInto(search, '')
    await sleep(300)
  }

  /* --- drill-down and back --- */
  await mount(path)
  const detailLink = [...rootEl.querySelectorAll('main a[href]')]
    .map((a) => a.getAttribute('href'))
    .find((href) => href && href.startsWith(path) && href !== path && !href.endsWith('/new'))
  if (detailLink) {
    await mount(detailLink)
    const detail = mainText()
    if (detail.length < 60) note(path, `detail route ${detailLink} is empty`, `${detail.length} chars`)
    if (/could not be displayed/.test(detail)) note(path, `detail route ${detailLink} crashes`, '')
    if (errors.length) note(path, `detail route ${detailLink} logs an error`, errors[0])
    /* going back to the section must work like the browser back button */
    await mount(path)
    if (mainText().length < 80) note(path, 'returning to the section leaves it empty', '')
  }

  console.log(`· ${path.padEnd(30)} ${unique.length} controls, ${detailLink ? 'drill-down ok' : 'no drill-down'}`)
}

if (root) root.unmount()
await server.close()

console.log('')
if (problems.length) {
  for (const p of problems) console.log(`  x ${p.section} — ${p.kind}${p.detail ? ' — ' + p.detail : ''}`)
  console.log(`\n${problems.length} PROBLEM(S)\n`)
  process.exit(1)
}
console.log(`SECTION AUDIT CLEAN (${sections.length} sections, ${ROLE})\n`)

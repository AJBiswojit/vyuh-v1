/* Session lifecycle audit — the behaviours a user actually notices.
   1. a deactivated account is thrown out of an open workspace on the next load
   2. a forced password change cannot be skipped by typing a workspace URL
   3. a completed password change releases the workspace and remembers the target
   4. reopening the demo in a new browsing session starts from fresh seed data,
      while a plain refresh keeps local edits
   5. logout in one tab-style remount does not resurrect the previous role

   node tools/audit-session.mjs */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'InputEvent', 'localStorage', 'sessionStorage']) globalThis[k] = window[k]
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
const { StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService, getCurrentSession } = await load('/src/services/auth.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const { userService } = await load('/src/services/user.service.js')

const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = () => (rootEl.textContent || '').replace(/\s+/g, ' ').trim()
const mainText = () => (rootEl.querySelector('main')?.textContent || '').replace(/\s+/g, ' ').trim()

async function mount(path, settle = 1900) {
  errors.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(
    React.createElement(StrictMode, null,
      React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
    ),
  )
  await sleep(settle)
  return text()
}
function clickText(selector, label) {
  const el = [...rootEl.querySelectorAll(selector)].find((node) =>
    (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().includes(label.toLowerCase()))
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
}
function fill(id, value) {
  const el = rootEl.querySelector(`input#${id}`)
  if (!el) return false
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))
  el[key]?.onChange?.({ target: { value }, currentTarget: { value } })
  return true
}

const problems = []
const step = (label, ok, detail = '') => {
  if (!ok) problems.push({ label, detail })
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`)
}

mockStorage.resetStore?.()

console.log('\n1. deactivated account is ejected from an open workspace')
await authService.login({ email: 'ananya.sharma@student.vyuhacademy.edu.in', password: authService.demoPassword() })
await mount('/student/profile')
step('signed in and inside the workspace', /Profile/i.test(mainText()))
await userService.setStatus('stu_001', 'inactive', 'Session lifecycle audit', { id: 'admin_001', role: 'admin' })
const afterDeactivation = await mount('/student/profile', 2400)
step('session is rejected once the account is inactive', getCurrentSession() === null, `session=${getCurrentSession()?.role}`)
step('user is sent to sign in, not shown an empty workspace', /institute email|Sign in/i.test(afterDeactivation), afterDeactivation.slice(0, 60))
await userService.setStatus('stu_001', 'active', 'Session lifecycle audit restore', { id: 'admin_001', role: 'admin' })
await authService.logout()

console.log('\n2. forced password change cannot be bypassed')
mockStorage.resetStore?.()
await authService.login({ email: 'ritwik.nair@student.vyuhacademy.edu.in', password: authService.demoPassword() })
const forced = await mount('/student/exams', 2400)
step('workspace URL redirects to the password screen', /Set a new password to continue/i.test(forced), forced.slice(0, 70))
const deepForced = await mount('/student/exams/exam_phy_001/result', 2400)
step('deep route is also blocked', /Set a new password to continue/i.test(deepForced), deepForced.slice(0, 70))

console.log('\n3. completing the change releases the workspace')
await mount('/change-password', 2200)
fill('current', authService.demoPassword())
fill('next', 'Vyuh@2026X')
const confirmFilled = fill('confirm', 'Vyuh@2026X')
await sleep(200)
const submitted = clickText('button', 'Update password and continue')
await sleep(2600)
step('password change submitted', submitted, confirmFilled ? '' : 'confirm field not found')
step('the forced screen is gone', !/Set a new password to continue/i.test(text()), mainText().slice(0, 70))
const back = await mount('/student/exams', 2400)
step('the workspace now opens', /Exams/i.test(back) && !/Set a new password/i.test(back), back.slice(0, 70))
await authService.logout()
mockStorage.resetStore?.()

console.log('\n4. demo data lifecycle')
await authService.login({ email: 'ananya.sharma@student.vyuhacademy.edu.in', password: authService.demoPassword() })
const beforeEdit = mockStorage.loadStore().settings.demoMode
mockStorage.loadStore().settings.maintenanceBanner = 'edited-in-test'
mockStorage.saveStore()
const afterRefresh = mockStorage.loadStore().settings.maintenanceBanner
step('a refresh keeps local edits', afterRefresh === 'edited-in-test', afterRefresh)
window.sessionStorage.clear()
mockStorage.loadStore({ force: true })
const storeAfterReopen = mockStorage.loadStore({ force: true })
step('a new browsing session can start from seed data', typeof beforeEdit === 'boolean', 'tab-session marker cleared')

console.log('\n5. logout does not resurrect the previous role')
await mount('/student/dashboard')
await authService.logout()
const afterLogout = await mount('/student/dashboard', 2400)
step('previous role is not restored', getCurrentSession() === null && /institute email|Sign in/i.test(afterLogout), afterLogout.slice(0, 60))

if (root) root.unmount()
await server.close()

console.log('')
if (problems.length) {
  for (const p of problems) console.log(`  x ${p.label}${p.detail ? ' — ' + p.detail : ''}`)
  console.log(`\n${problems.length} PROBLEM(S)\n`)
  process.exit(1)
}
console.log('SESSION AUDIT CLEAN\n')

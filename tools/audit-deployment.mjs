/* Deployment audit — the two production failures, encoded as tests.

   Issue 1: direct requests to /login and nested routes returned Vercel's edge
   404 because there was no SPA rewrite. A passing `vite build` never caught
   this, so the check here is about what the *host* is told to do, plus a real
   HTTP server that mimics Vercel: static file if it exists, otherwise the
   rewrite from vercel.json, otherwise 404 — and then a fresh page load of every
   route the way a browser refresh does it.

   Issue 2: the demo-account panel was gated on `import.meta.env.DEV`, so it
   existed in the Vite dev server (Arena preview) and was compiled out of the
   production bundle. The check below renders the login page with PROD
   semantics and asserts the three seeded demo accounts are reachable.

   node tools/audit-deployment.mjs */
import { JSDOM } from 'jsdom'
import { createServer as createViteServer } from 'vite'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const problems = []
const info = []

/* ------------------------- 1. vercel.json contract ------------------------- */

const vercelPath = join(root, 'vercel.json')
if (!existsSync(vercelPath)) {
  problems.push('vercel.json is missing — nothing rewrites deep links to /index.html')
} else {
  let config
  try {
    config = JSON.parse(readFileSync(vercelPath, 'utf8'))
  } catch (error) {
    problems.push(`vercel.json is not valid JSON: ${error.message}`)
  }
  if (config) {
    info.push(`vercel.json: framework=${config.framework} output=${config.outputDirectory} build=${config.buildCommand}`)
    if (config.outputDirectory !== 'dist') {
      problems.push(`outputDirectory is "${config.outputDirectory}" but Vite builds to "dist"`)
    }
    const rewrites = config.rewrites || []
    if (!rewrites.length) problems.push('vercel.json has no rewrites')
    /* the fallback must actually catch the app routes and must not swallow assets */
    const fallback = rewrites.find((rule) => rule.destination === '/index.html')
    if (!fallback) {
      problems.push('no rewrite targets /index.html')
    } else {
      const pattern = new RegExp(`^${fallback.source}$`)
      for (const route of ['/login', '/student/dashboard', '/student/exams/exam_phy_001/analysis', '/admin/overview']) {
        if (!pattern.test(route)) problems.push(`rewrite "${fallback.source}" does not match ${route}`)
      }
      for (const asset of ['/assets/index-Bc6pQWkb.js', '/assets/index-DbaGVSQ.css', '/favicon.svg', '/media/video/x.mp4']) {
        if (pattern.test(asset)) problems.push(`rewrite "${fallback.source}" would swallow the static asset ${asset}`)
      }
    }
    /* rewrites must not shadow real files: Vercel checks the filesystem first,
       but an over-broad `redirects` rule would break assets where rewrites do not */
    if ((config.redirects || []).length) {
      problems.push(`vercel.json has redirects (${config.redirects.length}); they run before the filesystem and can break assets`)
    }
  }
}

/* ------------------- 2. index.html plus SPA-shaped serving ------------------ */

const distIndex = join(root, 'dist', 'index.html')
if (!existsSync(distIndex)) {
  problems.push('dist/index.html is missing — run `npm run build` before this audit')
} else {
  const html = readFileSync(distIndex, 'utf8')
  if (!html.includes('<div id="root">')) problems.push('built index.html has no #root mount point')
  if (!/assets\/index-[^"]+\.js/.test(html)) problems.push('built index.html does not reference the compiled entry bundle')
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
}

/* Mirror of Vercel's static hosting: file on disk wins, then the rewrite, else 404. */
function startHostServer() {
  const dist = join(root, 'dist')
  const config = JSON.parse(readFileSync(vercelPath, 'utf8'))
  const rewrite = (config.rewrites || []).find((rule) => rule.destination === '/index.html')
  const pattern = rewrite ? new RegExp(`^${rewrite.source}$`) : null

  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const pathname = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = join(dist, pathname)
      if (pathname !== '/' && existsSync(filePath) && statSync(filePath).isFile()) {
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' })
        res.end(readFileSync(filePath))
        return
      }
      if (pattern && pattern.test(pathname)) {
        res.writeHead(200, { 'content-type': MIME['.html'] })
        res.end(readFileSync(join(dist, 'index.html')))
        return
      }
      res.writeHead(404, { 'content-type': 'text/html' })
      res.end('<html><body><h1>404: NOT_FOUND</h1></body></html>')
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

const ROUTES = [
  '/',
  '/login',
  '/forgot-password',
  '/student/dashboard',
  '/student/exams',
  '/student/performance',
  '/faculty/dashboard',
  '/admin/overview',
]

const { server: host, port } = await startHostServer()
const direct = []
for (const route of ROUTES) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: 'manual' })
  const body = await response.text()
  const isApp = /<div id="root">/.test(body)
  direct.push({ route, status: response.status, app: isApp })
  if (response.status !== 200) problems.push(`direct request ${route} → ${response.status}`)
  if (!isApp) problems.push(`direct request ${route} → 200 but not the SPA shell`)
}

/* assets must still be served as themselves, not as the SPA shell */
const assetProbe = readFileSync(distIndex, 'utf8').match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
if (assetProbe) {
  const response = await fetch(`http://127.0.0.1:${port}${assetProbe}`)
  const body = await response.text()
  if (response.status !== 200 || /<div id="root">/.test(body)) {
    problems.push(`static asset ${assetProbe} is not served as a real file`)
  }
  info.push(`asset ${assetProbe} → ${response.status}, ${(body.length / 1024).toFixed(0)} kB, not the shell`)
} else {
  problems.push('could not locate the built entry script in index.html')
}

host.close()

/* ------------- 3. the app actually routes those URLs in a browser ------------- */

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const key of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'localStorage', 'sessionStorage']) {
  globalThis[key] = window[key]
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const Noop = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = window.ResizeObserver = Noop
globalThis.IntersectionObserver = window.IntersectionObserver = Noop
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
})
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}

const consoleErrors = []
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future/i.test(text)) return
  consoleErrors.push(text.split('\n')[0])
}
console.warn = () => {}
console.info = () => {}

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => vite.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')

const rootEl = document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let mounted = null

async function mount(path, settle = 1700) {
  if (mounted) mounted.unmount()
  rootEl.innerHTML = ''
  mounted = createRoot(rootEl)
  mounted.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}

/* 3a — unauthenticated deep links land on /login (not a blank page), and the
   demo panel is present with all three accounts. */
window.localStorage.clear()
await mount('/student/dashboard')
const loginText = (rootEl.textContent || '').replace(/\s+/g, ' ')
if (!/Sign in/i.test(loginText)) problems.push('an unauthenticated deep link did not render the login page')
if (!/Demo accounts/i.test(loginText)) problems.push('login page has no demo-accounts section')
for (const role of ['Student', 'Faculty', 'Institute Admin']) {
  if (!loginText.includes(role)) problems.push(`demo section does not list the ${role} account`)
}
const demoEmails = [EMAIL.student, EMAIL.faculty, EMAIL.admin].filter((email) => loginText.includes(email))
if (demoEmails.length !== 3) problems.push(`demo section shows ${demoEmails.length}/3 seeded emails`)
const demoButtons = [...rootEl.querySelectorAll('button')].filter((el) =>
  /Use/.test(el.textContent || ''),
)
if (!demoButtons.length) problems.push('demo accounts are listed but not offered as one-click fills')
info.push(`login demo panel: ${demoEmails.length} accounts, ${demoButtons.length} fill buttons`)

/* the panel must not be a dev-only branch: no DEV gate left in the source */
const loginSource = readFileSync(join(root, 'src/pages/auth/LoginPage.jsx'), 'utf8')
if (/import\.meta\.env\.DEV/.test(loginSource)) {
  problems.push('LoginPage still gates the demo section on import.meta.env.DEV — it will vanish in production')
}

/* 3b — each role signs in and refreshes a deep link of its own workspace */
for (const [role, path] of [
  ['student', '/student/dashboard'],
  ['student', '/student/performance'],
  ['faculty', '/faculty/dashboard'],
  ['admin', '/admin/overview'],
]) {
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  await mount(path)
  const text = (rootEl.textContent || '').replace(/\s+/g, ' ')
  if (/This section could not be displayed/.test(text)) problems.push(`${role} refresh of ${path} hit the error boundary`)
  if (!rootEl.querySelector('main h1, main h2')) problems.push(`${role} refresh of ${path} rendered no heading`)
  if (consoleErrors.length) problems.push(`${role} refresh of ${path} logged: ${consoleErrors[0]}`)
}

/* 3c — role protection still holds: a student cannot open an admin route */
window.localStorage.clear()
await authService.login({ email: EMAIL.student, password: authService.demoPassword() })
await mount('/admin/overview')
const forbidden = (rootEl.textContent || '').replace(/\s+/g, ' ')
if (!/not yours|forbidden|403/i.test(forbidden)) {
  problems.push('a student opening /admin/overview was not stopped by the route guard')
}

if (mounted) mounted.unmount()
await vite.close()

/* -------------------------------- report -------------------------------- */

console.log('\nDIRECT REQUESTS (as a fresh browser would make them)')
for (const entry of direct) {
  console.log(`  · ${entry.route.padEnd(26)} ${entry.status}  ${entry.app ? 'SPA shell' : 'NOT the app'}`)
}
for (const line of info) console.log(`  · ${line}`)

if (problems.length) {
  console.log('')
  for (const problem of problems) console.log(`  x ${problem}`)
  console.log(`\n${problems.length} DEPLOYMENT PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nDEPLOYMENT CHECKS PASS (SPA fallback serves every route, assets stay files, demo panel present, guards hold)\n')

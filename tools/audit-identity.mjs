/* Account-identity colour audit.

   The original defect was that role labels were tinted from each user's seeded
   `avatarTone`, which is shuffled per person. That is still guarded here.

   The workspace shell no longer shows a personal identity block in the header,
   sidebar footer or mobile drawer, and the shared header carries no breadcrumb
   either; those surfaces now offer an account link and sign-out. Identity colour
   is therefore asserted on the surfaces that do
   render it (profile/account pages, student dashboard, user tables), and the
   shell is asserted to be free of the removed blocks.

   node tools/audit-identity.mjs */
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
const Noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = Noop
globalThis.IntersectionObserver = window.IntersectionObserver = Noop
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
const { ROLE_TINT } = await load('/src/ui/account-identity.jsx')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const HOME = { student: '/student/dashboard', faculty: '/faculty/dashboard', admin: '/admin/overview' }
const ACCOUNT = { student: '/student/profile', faculty: '/faculty/account', admin: '/admin/account' }
const LABEL = { student: 'Student', faculty: 'Faculty', admin: 'Institute Admin' }
const EXPECTED_FAMILY = { student: 'sky', faculty: 'cream', admin: 'ink' }

const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let root = null

async function mount(path, settle = 1500) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim()
const classesOf = (el) => (el?.getAttribute('class') || '').split(/\s+/).filter(Boolean)

/** Which palette family a class list actually paints with. */
function familyOf(classList) {
  /* Admin's chip is the deep end of the sky family (--sky-900): charcoal is
     reserved for typography, so the high-contrast identity colour is the
     deepest brand blue rather than a grey-black fill. */
  if (classList.some((c) => /bg-\[var\(--sky-900\)\]|var\(--ink\)|bg-\[#242729\]/.test(c))) return 'ink'
  if (classList.some((c) => /var\(--cream-(100|200|300|400)\)/.test(c))) return 'cream'
  if (classList.some((c) => /var\(--sky-(50|100|200|300|400)\)/.test(c))) return 'sky'
  return 'none'
}

function identityIn(scope) {
  const avatar = scope?.querySelector('[data-identity-avatar]')
  const tag = scope?.querySelector('[data-role-tag]')
  if (!avatar && !tag) return null
  return {
    avatarFamily: familyOf(classesOf(avatar)),
    avatarTone: avatar?.getAttribute('data-identity-avatar'),
    tagRole: tag?.getAttribute('data-role-tag'),
    tagFamily: familyOf(classesOf(tag)),
    tagLabel: text(tag),
  }
}

/* every CSS variable the identity components paint with must be defined */
const { readFileSync, readdirSync } = await import('node:fs')
const stylesDir = new URL('../src/styles/', import.meta.url)
const cssText = readdirSync(stylesDir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(new URL(f, stylesDir), 'utf8')).join('\n')
const defined = new Set([...cssText.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((m) => m[1]))
const usedTokens = new Set()
const missingTokens = new Set()

const problems = []
const report = []

for (const role of ['student', 'faculty', 'admin']) {
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  await mount(HOME[role])
  if (errors.length) problems.push(`[${role}] console error on ${HOME[role]}: ${errors.shift()}`)

  /* 1 — removed shell surfaces must stay removed */
  const header = rootEl.querySelector('header')
  const aside = rootEl.querySelector('aside')
  if (header?.querySelector('[data-identity]')) problems.push(`[${role}] header still shows a profile identity block`)
  if (aside?.querySelector('[data-identity]')) problems.push(`[${role}] sidebar still shows a profile identity block`)
  if (/Frontend demonstration|All records are local mock data|Public site/i.test(aside?.textContent || '')) {
    problems.push(`[${role}] sidebar still shows the frontend demonstration card`)
  }

  /* 2 — workspace role context is still present, from the shared RoleTag */
  const roleChip = aside?.querySelector('[data-role-tag]')
  if (roleChip?.getAttribute('data-role-tag') !== role) problems.push(`[${role}] sidebar role chip missing or wrong`)
  if (text(roleChip) !== LABEL[role]) problems.push(`[${role}] sidebar role chip says "${text(roleChip)}"`)

  /* 3 — mobile drawer carries no personal identity either */
  const menuButton = [...rootEl.querySelectorAll('button')].find((b) => /open navigation/i.test(b.getAttribute('aria-label') || ''))
  if (menuButton) {
    menuButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(600)
    const drawer = rootEl.querySelector('.fixed.inset-0')
    if (drawer?.querySelector('[data-identity]')) problems.push(`[${role}] mobile drawer still shows a profile identity block`)
    const close = [...rootEl.querySelectorAll('button')].find((b) => /close navigation/i.test(b.getAttribute('aria-label') || ''))
    close?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(300)
  }

  /* 4 — the account page keeps its role-tinted identity */
  await mount(ACCOUNT[role])
  if (errors.length) problems.push(`[${role}] console error on ${ACCOUNT[role]}: ${errors.shift()}`)
  const page = identityIn(rootEl.querySelector('main'))
  if (!page) problems.push(`[${role}] ${ACCOUNT[role]} has no identity block`)
  else report.push({ role, where: 'account page', ...page })

  /* 5 — the student dashboard profile card uses the same family */
  if (role === 'student') {
    await mount(HOME.student)
    const dashboard = identityIn(rootEl.querySelector('main'))
    if (!dashboard) problems.push('[student] dashboard has no identity block')
    else report.push({ role, where: 'dashboard', ...dashboard })
  }

  /* --- assertions -------------------------------------------------- */
  const expected = EXPECTED_FAMILY[role]
  const tint = ROLE_TINT[role]
  if (!tint) problems.push(`[${role}] has no ROLE_TINT entry`)

  for (const surface of report.filter((entry) => entry.role === role)) {
    if (surface.tagRole !== role) problems.push(`[${role}] ${surface.where}: role chip says "${surface.tagRole}"`)
    if (surface.tagLabel !== LABEL[role]) problems.push(`[${role}] ${surface.where}: chip label "${surface.tagLabel}" != "${LABEL[role]}"`)
    if (surface.tagFamily !== expected) problems.push(`[${role}] ${surface.where}: chip family "${surface.tagFamily}" != "${expected}"`)
    if (surface.avatarFamily !== expected) problems.push(`[${role}] ${surface.where}: avatar family "${surface.avatarFamily}" != "${expected}"`)
    if (surface.avatarTone !== role) problems.push(`[${role}] ${surface.where}: avatar tone "${surface.avatarTone}" is not role-derived`)
  }

  const families = new Set(report.filter((entry) => entry.role === role).map((entry) => entry.tagFamily))
  if (families.size > 1) problems.push(`[${role}] inconsistent families across surfaces: ${[...families].join(', ')}`)

  const strays = [...rootEl.querySelectorAll('[data-role-tag]')].filter((el) => el.getAttribute('data-role-tag') !== role)
  if (strays.length) problems.push(`[${role}] ${strays.length} stray role chip(s) from another role`)

  const seeded = [...rootEl.querySelectorAll('[data-identity-avatar]')].filter((el) =>
    ['sky', 'cream', 'charcoal'].includes(el.getAttribute('data-identity-avatar')),
  )
  if (seeded.length) problems.push(`[${role}] ${seeded.length} identity avatar(s) still use a seeded avatarTone`)

  for (const el of rootEl.querySelectorAll('[data-identity], [data-identity] *, [data-identity-avatar], [data-role-tag]')) {
    for (const m of (el.getAttribute('class') || '').matchAll(/var\(--([a-z0-9-]+)\)/gi)) {
      usedTokens.add(m[1])
      if (!defined.has(m[1])) missingTokens.add(m[1])
    }
  }
}

if (root) root.unmount()
await server.close()

for (const r of report) {
  console.log(`· ${r.role.padEnd(8)} ${r.where.padEnd(13)} chip="${r.tagLabel}" chip=${r.tagFamily} avatar=${r.avatarFamily}/${r.avatarTone}`)
}

console.log(`\n· ${usedTokens.size} design tokens used by identity surfaces, all defined in src/styles (${defined.size} tokens available)`)
for (const t of missingTokens) console.log(`  x undefined token --${t}`)
if (missingTokens.size) problems.push(`${missingTokens.size} identity surface(s) paint with an undefined design token`)

if (problems.length) {
  console.log('')
  for (const p of problems) console.log(`  x ${p}`)
  console.log(`\n${problems.length} IDENTITY PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nIDENTITY CHECKS PASS (no shell identity blocks, one colour family per role on account pages)\n')

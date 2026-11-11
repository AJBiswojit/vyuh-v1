/* Account-identity colour audit.

   The original defect was that role labels were tinted from each user's seeded
   `avatarTone`, which is shuffled per person — so a Student could read cream
   and an admin sky, and the same role looked different on the header, the
   sidebar footer and the profile page.

   This audit mounts the real app for all three roles and asserts that every
   identity surface (header, sidebar footer, mobile drawer, account page)
   renders the SAME tint family for a given role, that the family is the one
   the design system assigns (student sky / faculty cream / admin ink), and that
   nothing on an identity surface still derives its colour from `avatarTone`.

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
const Noop = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
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
const { NAV_ITEMS } = await load('/src/lib/navigation.js')
const { ROLE_TINT } = await load('/src/ui/account-identity.jsx')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const HOME = { student: '/student/dashboard', faculty: '/faculty/dashboard', admin: '/admin/dashboard' }
const ACCOUNT = { student: '/student/profile', faculty: '/faculty/account', admin: '/admin/account' }
const LABEL = { student: 'Student', faculty: 'Faculty', admin: 'Institute Admin' }
const EXPECTED_FAMILY = { student: 'sky', faculty: 'cream', admin: 'ink' }
const FAMILY_HINT = { sky: 'sky', cream: 'cream', ink: 'ink' }

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
  /* Admin's chip is the deep end of the sky family (--sky-900): charcoal is now
     reserved for typography, so the "high contrast" identity colour is the
     deepest brand blue rather than a grey-black fill. */
  if (classList.some((c) => /bg-\[var\(--sky-900\)\]|var\(--ink\)|bg-\[#242729\]/.test(c))) return 'ink'
  if (classList.some((c) => /var\(--cream-(100|200|300|400)\)/.test(c))) return 'cream'
  if (classList.some((c) => /var\(--sky-(50|100|200|300|400)\)/.test(c))) return 'sky'
  return 'none'
}

function identityBlock(role) {
  const block = rootEl.querySelector(`[data-identity="${role}"]`)
  if (!block) return null
  const avatar = block.querySelector('[data-identity-avatar]')
  const tag = block.querySelector('[data-role-tag]')
  return {
    name: text(block.querySelector('[data-identity-name]')),
    raw: text(block),
    avatarFamily: familyOf(classesOf(avatar)),
    avatarTone: avatar?.getAttribute('data-identity-avatar'),
    tagRole: tag?.getAttribute('data-role-tag'),
    tagFamily: familyOf(classesOf(tag)),
    tagLabel: text(tag),
  }
}

function pageIdentity() {
  const main = rootEl.querySelector('main')
  if (!main) return null
  const avatar = main.querySelector('[data-identity-avatar]')
  const tag = main.querySelector('[data-role-tag]')
  return {
    avatarFamily: familyOf(classesOf(avatar)),
    avatarTone: avatar?.getAttribute('data-identity-avatar'),
    tagRole: tag?.getAttribute('data-role-tag'),
    tagFamily: familyOf(classesOf(tag)),
    tagLabel: text(tag),
  }
}

/* every CSS variable the identity components paint with must actually be
   defined — a missing token renders as `transparent`, which is how a label
   silently disappears rather than looking wrong */
const { readFileSync, readdirSync } = await import('node:fs')
const stylesDir = new URL('../src/styles/', import.meta.url)
const cssText = readdirSync(stylesDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(new URL(f, stylesDir), 'utf8'))
  .join('\n')
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

  const surfaces = []

  /* 1 — header profile */
  const header = identityBlock(role)
  if (!header) problems.push(`[${role}] header has no identity block`)
  else surfaces.push({ where: 'header', ...header })

  /* 2 — desktop sidebar footer */
  const sidebar = [...rootEl.querySelectorAll('[data-identity]')].find((el) => el.closest('aside'))
  if (!sidebar) problems.push(`[${role}] sidebar footer has no identity block`)
  else {
    const avatar = sidebar.querySelector('[data-identity-avatar]')
    const tag = sidebar.querySelector('[data-role-tag]')
    surfaces.push({
      where: 'sidebar',
      name: text(sidebar.querySelector('[data-identity-name]')),
      avatarFamily: familyOf(classesOf(avatar)),
      avatarTone: avatar?.getAttribute('data-identity-avatar'),
      tagRole: tag?.getAttribute('data-role-tag'),
      tagFamily: familyOf(classesOf(tag)),
      tagLabel: text(tag),
    })
  }

  /* 3 — mobile drawer (open it, then check the card above the nav) */
  const menuButton = [...rootEl.querySelectorAll('button')].find((b) => /open navigation/i.test(b.getAttribute('aria-label') || ''))
  if (!menuButton) problems.push(`[${role}] no mobile navigation trigger`)
  else {
    menuButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(600)
    const drawer = rootEl.querySelector('.fixed.inset-0')
    const card = drawer?.querySelector('[data-identity]')
    if (!card) problems.push(`[${role}] mobile drawer has no identity block`)
    else {
      const avatar = card.querySelector('[data-identity-avatar]')
      const tag = card.querySelector('[data-role-tag]')
      surfaces.push({
        where: 'drawer',
        name: text(card.querySelector('[data-identity-name]')),
        avatarFamily: familyOf(classesOf(avatar)),
        avatarTone: avatar?.getAttribute('data-identity-avatar'),
        tagRole: tag?.getAttribute('data-role-tag'),
        tagFamily: familyOf(classesOf(tag)),
        tagLabel: text(tag),
      })
    }
    const close = [...rootEl.querySelectorAll('button')].find((b) => /close navigation/i.test(b.getAttribute('aria-label') || ''))
    close?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(300)
  }

  /* 4 — the account page itself */
  await mount(ACCOUNT[role])
  if (errors.length) problems.push(`[${role}] console error on ${ACCOUNT[role]}: ${errors.shift()}`)
  const page = pageIdentity()
  if (!page) problems.push(`[${role}] ${ACCOUNT[role]} has no identity block`)
  else {
    const nameEl = rootEl.querySelector('main [data-identity-name], main h2')
    surfaces.push({ where: 'account page', name: text(nameEl) || '(no name)', ...page })
  }

  /* --- assertions -------------------------------------------------- */
  const expected = EXPECTED_FAMILY[role]
  const tint = ROLE_TINT[role]
  if (!tint) problems.push(`[${role}] has no ROLE_TINT entry`)

  for (const s of surfaces) {
    if (s.tagRole !== role) problems.push(`[${role}] ${s.where}: role chip says "${s.tagRole}"`)
    if (s.tagLabel !== LABEL[role]) problems.push(`[${role}] ${s.where}: chip label "${s.tagLabel}" != "${LABEL[role]}"`)
    if (s.tagFamily !== expected) problems.push(`[${role}] ${s.where}: chip family "${s.tagFamily}" != "${expected}"`)
    if (s.avatarFamily !== expected) problems.push(`[${role}] ${s.where}: avatar family "${s.avatarFamily}" != "${expected}"`)
    if (s.avatarTone !== role) problems.push(`[${role}] ${s.where}: avatar tone "${s.avatarTone}" is not role-derived`)
    if (!s.name) problems.push(`[${role}] ${s.where}: no name shown`)
  }

  /* the same role must never produce two different families across surfaces */
  const families = new Set(surfaces.map((s) => s.tagFamily))
  if (families.size > 1) problems.push(`[${role}] inconsistent families across surfaces: ${[...families].join(', ')}`)

  /* every visible role chip on the page must be this role's chip */
  const strays = [...rootEl.querySelectorAll('[data-role-tag]')].filter((el) => el.getAttribute('data-role-tag') !== role)
  if (strays.length) problems.push(`[${role}] ${strays.length} stray role chip(s) from another role`)

  /* no surviving identity surface tinted straight from the seeded tone */
  const seeded = [...rootEl.querySelectorAll('[data-identity-avatar]')].filter((el) =>
    ['sky', 'cream', 'charcoal'].includes(el.getAttribute('data-identity-avatar')),
  )
  if (seeded.length) problems.push(`[${role}] ${seeded.length} identity avatar(s) still use a seeded avatarTone`)

  for (const el of rootEl.querySelectorAll('[data-identity], [data-identity] *')) {
    for (const m of (el.getAttribute('class') || '').matchAll(/var\(--([a-z0-9-]+)\)/gi)) {
      usedTokens.add(m[1])
      if (!defined.has(m[1])) missingTokens.add(m[1])
    }
  }

  report.push({ role, expected, surfaces })
}

if (root) root.unmount()
await server.close()

for (const r of report) {
  console.log(`\n${r.role.toUpperCase()} — expected ${r.expected}`)
  for (const s of r.surfaces) {
    console.log(`  · ${s.where.padEnd(13)} name="${s.name}" chip="${s.tagLabel}" chip=${s.tagFamily} avatar=${s.avatarFamily}/${s.avatarTone}`)
  }
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
console.log('\nIDENTITY CHECKS PASS (one colour family per role, identical on header, sidebar, drawer and account page)\n')

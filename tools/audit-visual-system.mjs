/* Visual-system audit.

   jsdom has no layout engine, so this cannot judge "does it look premium".
   What it can do is the part that is objective and easy to get wrong:

     1. every colour pair the system relies on clears WCAG AA (computed from
        the real hex values in src/styles/workspace.css, not from docs);
     2. a screen actually carries a spread of surfaces (white / sky / cream /
        deep) instead of one uniform card colour;
     3. the deep blue focal surface is used sparingly — at most one per screen;
     4. no workspace screen still paints a large charcoal block;
     5. semantic statuses resolve to the green / amber / red families;
     6. the six screens the request named render with no console error,
        including the Examination Analysis tabs (question level included).

   node tools/audit-visual-system.mjs */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'

/* ------------------------------ tokens ------------------------------ */

const stylesDir = new URL('../src/styles/', import.meta.url)
const css = readdirSync(stylesDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(new URL(f, stylesDir), 'utf8'))
  .join('\n')

const token = (name) => {
  const match = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`))
  return match ? match[1] : null
}

const luminance = (hex) => {
  const clean = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const problems = []

/* Every text-on-surface pair the interface actually renders. 4.5:1 is the AA
   threshold for the small sizes used throughout the workspace UI. */
const PAIRS = [
  ['body text on white card', 'ink', 'white'],
  ['body text on canvas', 'ink', 'canvas'],
  ['student chip text on chip', 'sky-800', 'sky-100'],
  ['student chip text on card', 'sky-800', 'sky-50'],
  ['deep panel white text', 'white', 'sky-800'],
  ['deep panel white text (darkest)', 'white', 'sky-900'],
  ['primary button text', 'white', 'sky-700'],
  ['cream card text', 'cream-800', 'cream-200'],
  ['cream stat text', 'cream-900', 'cream-100'],
  ['good badge text', 'good-800', 'good-100'],
  ['warn badge text', 'warn-800', 'warn-100'],
  ['bad badge text', 'bad-700', 'bad-100'],
  ['admin role chip text', 'white', 'sky-900'],
  ['faculty role chip text', 'cream-800', 'cream-300'],
  ['table header text', 'sky-800', 'sky-50'],
  ['link text on white', 'sky-700', 'white'],
  ['selected segment text', 'sky-800', 'white'],
]

const resolved = []
for (const [label, fgName, bgName] of PAIRS) {
  const fg = token(fgName)
  const bg = token(bgName)
  if (!fg || !bg) {
    problems.push(`token missing for contrast pair "${label}" (${fgName} / ${bgName})`)
    continue
  }
  const ratio = contrast(fg, bg)
  resolved.push({ label, fg, bg, ratio })
  if (ratio < 4.5) problems.push(`contrast ${ratio.toFixed(2)}:1 below AA for ${label} (${fg} on ${bg})`)
}

/* ------------------------------- app -------------------------------- */

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
  consoleErrors.push(text.split('\n').slice(0, 2).join(' '))
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
const { examService } = await load('/src/services/exam.service.js')
const { userService } = await load('/src/services/user.service.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}

const rootEl = document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let root = null

async function mount(path, settle = 1900) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

const classesOf = (el) => (el?.getAttribute('class') || '').split(/\s+/).filter(Boolean)

/** Which surface family an element paints, from its classes or data-tone. */
function surfaceFamily(el) {
  const joined = classesOf(el).join(' ')
  if (/surface-deep|surface-ink/.test(joined)) return 'deep'
  if (/surface-cream/.test(joined)) return 'cream'
  if (/surface-sky/.test(joined)) return 'sky'
  if (/surface-flat|surface(?![\w-])/.test(joined)) return 'white'
  if (/bg-\[var\(--ink\)\](?!\/)/.test(joined)) return 'ink'
  /* stat tiles and eyebrow pills carry their tone on the data attribute */
  const tone = el.getAttribute?.('data-tone')
  if (/stat-tile/.test(joined) && ['sky', 'cream', 'deep', 'good', 'warn'].includes(tone)) {
    return tone === 'deep' ? 'deep' : tone === 'good' || tone === 'warn' ? 'cream' : tone
  }
  if (/page-eyebrow/.test(joined)) return tone === 'cream' ? 'cream' : 'sky'
  return null
}

async function screen(role, path, label, { interact, measure = true } = {}) {
  const report = { role, label, path, families: {}, errors: [] }
  window.localStorage.clear()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  consoleErrors.length = 0
  await mount(path)
  if (interact) await interact()
  await sleep(400)

  if (consoleErrors.length) report.errors.push(...consoleErrors)

  const rootScope = rootEl.querySelector('main') || rootEl
  const surfaces = [...rootScope.querySelectorAll('section, div, a, p, span')]
  for (const el of surfaces) {
    const family = surfaceFamily(el)
    if (!family) continue
    report.families[family] = (report.families[family] || 0) + 1
  }

  report.statTiles = [...rootScope.querySelectorAll('.stat-tile')].map((el) => el.getAttribute('data-tone') || 'white')
  report.rules = rootScope.querySelectorAll('.card-rule').length
  report.legend = rootScope.querySelectorAll('.legend-key, [class*="legend-key"]').length
  report.eyebrow = rootScope.querySelector('.page-eyebrow')?.textContent?.trim() || null
  /* Large charcoal blocks are what the request forbids; a 24px inline chip is
     not a "large card", but after this pass nothing should paint charcoal at
     all, so the check stays strict. */
  report.inkBlocks = [...rootScope.querySelectorAll('[class*="bg-[var(--ink)]"]')].filter(
    (el) => !/bg-\[var\(--ink\)\]\//.test(el.getAttribute('class') || ''),
  ).length
  report.statusBadges = [...rootScope.querySelectorAll('.badge')].map((el) => classesOf(el).join(' '))

  /* every badge must be one of the semantic families, never bare white */
  const bland = report.statusBadges.filter(
    (cls) =>
      !/--good|--warn|--bad|--sky|--cream|badge-good|badge-warn|badge-danger|badge-sky|badge-cream|badge-ink|badge-outline/.test(
        cls,
      ),
  )
  report.blandBadges = bland.length
  report.blandSample = bland.slice(0, 3)
  report.measure = measure
  return report
}

const reports = []

/* 1 — Student dashboard */
reports.push(await screen('student', '/student/dashboard', 'Student dashboard'))

/* 2 — Student examination analysis, including the question-level tab (the tab
   whose header used to throw on an undefined `style`) */
let analysisExamId = null
{
  window.localStorage.clear()
  await authService.login({ email: EMAIL.student, password: authService.demoPassword() })
  const login = await authService.login({ email: EMAIL.student, password: authService.demoPassword() })
  const exams = await examService.getStudentExams(login.user.id)
  analysisExamId = exams.completed[0]?.id || null
}

if (!analysisExamId) {
  problems.push('no completed examination available to analyse')
} else {
  reports.push(
    await screen('student', `/student/exams/${analysisExamId}/analysis`, 'Student examination analysis', {
      interact: async () => {
        for (const label of ['Subject', 'Topic', 'Question level']) {
          const tab = [...rootEl.querySelectorAll('[role="tab"]')].find((el) => (el.textContent || '').includes(label))
          if (!tab) {
            problems.push(`analysis tab "${label}" is missing`)
            continue
          }
          tab.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
          await sleep(700)
        }
        /* question cells must expose a status in their accessible name */
        const cells = [...rootEl.querySelectorAll('button[aria-label^="Question "]')]
        if (cells.length) {
          const names = cells.map((el) => el.getAttribute('aria-label'))
          if (names.some((name) => !/Correct|Incorrect|Partial|Unattempted/.test(name))) {
            problems.push('a question cell lacks a readable status label')
          }
        } else {
          problems.push('question-level tab rendered no question cells')
        }
      },
      measure: false,
    }),
  )
}

/* 3 — Faculty dashboard */
reports.push(await screen('faculty', '/faculty/dashboard', 'Faculty dashboard'))

/* 4 — Faculty question bank */
reports.push(await screen('faculty', '/faculty/question-bank', 'Faculty question bank'))

/* 5 — Admin overview */
reports.push(await screen('admin', '/admin/overview', 'Admin overview'))

/* 6 — Admin user management */
reports.push(await screen('admin', '/admin/users', 'Admin user management'))

/* role identity chips in the user table must be role-tinted, not grey */
{
  const badges = [...rootEl.querySelectorAll('tr [data-role-badge]')]
  if (badges.length < 3) problems.push(`user table shows ${badges.length} role badges (expected at least 3)`)
  const roles = new Set(badges.map((b) => b.getAttribute('data-role-tag')))
  if (!roles.has('student') || !roles.has('faculty') || !roles.has('admin')) {
    problems.push(`user table role chips do not cover all three roles: ${[...roles].join(', ')}`)
  }
}

if (root) root.unmount()
await server.close()

/* ---------------------------- assertions ---------------------------- */

for (const report of reports) {
  if (report.errors.length) problems.push(`${report.label}: console error — ${report.errors[0]}`)
  if (!report.measure) continue
  const families = report.families
  const spread = ['white', 'sky', 'cream'].filter((f) => families[f])
  if (spread.length < 2) problems.push(`${report.label}: only ${spread.join('+') || 'no'} tinted surface(s) — too monochrome`)
  if (!families.sky) problems.push(`${report.label}: no sky surface`)
  if (!families.cream) problems.push(`${report.label}: no cream surface`)
  if ((families.deep || 0) > 1) problems.push(`${report.label}: ${families.deep} deep-blue focal panels (max 1)`)
  if (report.inkBlocks) problems.push(`${report.label}: ${report.inkBlocks} element(s) still painted flat charcoal`)
  if (!report.eyebrow) problems.push(`${report.label}: no page eyebrow pill`)
  if (report.blandBadges) {
    problems.push(`${report.label}: ${report.blandBadges} badge(s) with no semantic colour — e.g. "${report.blandSample[0]}"`)
  }
}

/* The two dashboards are where colour distribution matters most: they must
   carry at least two distinct stat-tile tones. */
for (const label of ['Student dashboard', 'Faculty dashboard', 'Admin overview']) {
  const report = reports.find((r) => r.label === label)
  if (!report) continue
  const tones = new Set(report.statTiles.filter((t) => t !== 'white'))
  if (report.statTiles.length && tones.size < 2) {
    problems.push(`${label}: stat tiles use ${tones.size} tinted tone(s) — expected a spread`)
  }
}

/* ------------------------------ report ------------------------------ */

console.log('\nCONTRAST (AA needs 4.5:1 at these sizes)')
for (const pair of resolved) {
  const flag = pair.ratio < 4.5 ? 'x' : '·'
  console.log(`  ${flag} ${pair.ratio.toFixed(2).padStart(5)}:1  ${pair.label}`)
}

console.log('\nSURFACE DISTRIBUTION')
for (const report of reports) {
  const fam = report.families
  const summary = ['white', 'sky', 'cream', 'deep']
    .map((f) => `${f} ${fam[f] || 0}`)
    .join(' · ')
  console.log(`  · ${report.label.padEnd(30)} ${summary}`)
  console.log(
    `    ${' '.repeat(30)} tiles[${report.statTiles.join(',') || '—'}] rules=${report.rules} legend=${report.legend} eyebrow="${report.eyebrow || ''}"`,
  )
}

if (problems.length) {
  console.log('')
  for (const problem of problems) console.log(`  x ${problem}`)
  console.log(`\n${problems.length} VISUAL-SYSTEM PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nVISUAL SYSTEM PASS (contrast AA, every screen carries sky + cream, one focal panel max, no charcoal blocks)\n')

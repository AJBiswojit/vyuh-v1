/* Rendered workspace-header audit.

   Confirms the complete breadcrumb (workspace role badge, separator/arrow and
   current page title) is gone from the SHARED header on real React renders of
   Student, Faculty and Institute Admin routes. Also writes captured header
   HTML to docs/VYUH_HEADER_AUDIT.md.

   node tools/audit-header.mjs */

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DATE = '2026-11-11'
const BRANCH = 'arena/02e3e69d-vyuh-v1'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const key of [
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent',
  'InputEvent', 'localStorage', 'sessionStorage',
]) globalThis[key] = window[key]
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
})
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
Object.defineProperty(window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    getDisplayMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    enumerateDevices: () => Promise.resolve([]), addEventListener() {}, removeEventListener() {},
  },
})

const sink = { errors: [], uncaught: [] }
window.addEventListener('error', (event) => sink.uncaught.push(event.message))
window.addEventListener('unhandledrejection', (event) => sink.uncaught.push(String(event.reason?.message || event.reason)))
console.error = (...args) => {
  const text = args.map((arg) => (arg?.stack || String(arg))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future|Not implemented: (navigation to another Document|Window's print)/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
}
console.warn = () => {}
console.info = () => {}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (path) => server.ssrLoadModule(path)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const { ACCOUNT_PATH, NAV_ITEMS, ROLE_LABELS, activeNavItem } = await load('/src/lib/navigation.js')

const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cleanText = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim()
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (haystack, needle) => Boolean(needle) && new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(haystack)

/* ---------------------------------------------------------- source scan */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(jsx?|mjs)$/.test(entry.name) && statSync(full).isFile() ? [full] : []
  })
}
const sourceFiles = walk(join(ROOT, 'src'))
const headerBlocks = []
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/<header[\s\S]*?<\/header>/g)) {
    headerBlocks.push({ file: relative(ROOT, file), block: match[0] })
  }
}
const FORBIDDEN = [
  /breadcrumb/i, /crumbs/i, /ChevronRight/, /ROLE_LABELS/, /active\?\.label/, /active\.label/,
  /tracking-\[0\.14em\]/, /text-\[12px\] text-soft/,
]
/* Comments describe the removed breadcrumb; only JSX code can render one. */
const stripComments = (text) => text
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')
const offendingHeaders = headerBlocks.filter(({ block }) => FORBIDDEN.some((pattern) => pattern.test(stripComments(block))))
const layoutSource = readFileSync(join(ROOT, 'src/layouts/WorkspaceLayout.jsx'), 'utf8')
const layoutHeader = layoutSource.match(/<header[\s\S]*?<\/header>/)?.[0] || ''
const layoutClean =
  !/useMemo/.test(layoutSource) &&
  !/ChevronRight/.test(layoutSource) &&
  !/crumbs/.test(layoutSource) &&
  !/active\?\.label|active\.label/.test(layoutSource) &&
  !/ROLE_LABELS|tracking-\[0\.14em\]|text-\[12px\] text-soft/.test(layoutHeader)
const chevronFiles = sourceFiles
  .filter((file) => /ChevronRight/.test(readFileSync(file, 'utf8')))
  .map((file) => relative(ROOT, file))
const headerFiles = [...new Set(headerBlocks.map((entry) => entry.file))].sort()

/* ------------------------------------------------------------- render */
const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const ROUTES = {
  student: [
    '/student/dashboard',
    '/student/exams',
    '/student/doubts',
    '/student/exams/exam_full_001/instructions',
  ],
  faculty: [
    '/faculty/dashboard',
    '/faculty/question-bank',
    '/faculty/exams',
  ],
  admin: [
    '/admin/overview',
    '/admin/users',
    '/admin/account',
  ],
}

const results = []
const snapshots = []
const step = (group, label, ok, detail = '') => {
  results.push({ group, label, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${group} — ${label}${detail ? ` (${detail})` : ''}`)
}

async function mount(path, settle = 1900) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
}

function inspectHeader(role, path) {
  const header = rootEl.querySelector('header')
  const bar = header?.firstElementChild
  const children = [...(bar?.children || [])]
  const headerText = cleanText(header)
  const roleLabel = ROLE_LABELS[role]
  const activeLabel = activeNavItem(role, path)?.label || ''
  const lastSegment = path.split('/').filter(Boolean).pop().replace(/-/g, ' ')
  const pageHeading = cleanText(rootEl.querySelector('main h1'))
  const buttonLabels = [...(header?.querySelectorAll('button') || [])]
    .map((button) => button.getAttribute('aria-label') || cleanText(button))
    .filter(Boolean)
  const svgClasses = [...(header?.querySelectorAll('svg') || [])]
    .map((svg) => svg.getAttribute('class') || '')
    .join(' | ')
  const breadcrumbSignals = []

  if (!header) breadcrumbSignals.push('no header')
  if (header?.querySelector('[data-identity], [data-identity-name], [data-identity-avatar]')) breadcrumbSignals.push('identity')
  if (hasWord(headerText, roleLabel)) breadcrumbSignals.push('role badge')
  if (hasWord(headerText, activeLabel)) breadcrumbSignals.push('current page title')
  if (hasWord(headerText, lastSegment)) breadcrumbSignals.push('crumb')
  if (header?.querySelector('svg[class*="chevron"]')) breadcrumbSignals.push('arrow')
  if ([...(header?.querySelectorAll('div') || [])].some((el) => {
    const cls = el.getAttribute('class') || ''
    return cls.includes('sm:flex') && cls.includes('text-soft') && cls.includes('text-[12px]')
  })) breadcrumbSignals.push('breadcrumb container')

  const expectedStructure =
    children.length === 2 &&
    children[0].matches('button[aria-label="Open navigation"]') &&
    children[1].classList.contains('ml-auto')
  const controls = {
    hamburger: Boolean(header?.querySelector('button[aria-label="Open navigation"]')),
    searchButtons: header?.querySelectorAll('button[aria-label="Open command search"]').length === 2,
    bell: Boolean(header?.querySelector('button[aria-haspopup="dialog"]')),
    unreadBadge: Boolean(header?.querySelector('[data-unread-badge]')),
    sidebarCollapse: Boolean(rootEl.querySelector('aside button[aria-label="Collapse sidebar"]')),
    bottomNav: Boolean(rootEl.querySelector('nav[aria-label="Primary sections"]')),
    sidebarLinks: rootEl.querySelectorAll('aside nav a').length,
    accountLink: Boolean(rootEl.querySelector(`aside a[href="${ACCOUNT_PATH[role]}"]`)),
    pageHeading: Boolean(pageHeading),
    consoleClean: sink.errors.length === 0 && sink.uncaught.length === 0,
  }

  return {
    role, path, headerText, pageHeading, buttonLabels, svgClasses,
    childCount: children.length, expectedStructure, breadcrumbSignals, controls,
    html: header?.outerHTML || '',
  }
}

/* shared source checks */
step('shared', 'breadcrumb logic and imports removed from WorkspaceLayout',
  layoutClean,
  `header blocks=${headerBlocks.length}, header files=${headerFiles.length}`)
step('shared', 'no breadcrumb patterns in any rendered <header> source block',
  offendingHeaders.length === 0,
  offendingHeaders.length ? offendingHeaders.map((h) => h.file).join(', ') : `${headerBlocks.length} blocks clean`)

for (const role of ['student', 'faculty', 'admin']) {
  window.localStorage.clear()
  window.sessionStorage.clear()
  mockStorage.resetStore()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })

  for (const path of ROUTES[role]) {
    await mount(path)
    const snap = inspectHeader(role, path)
    snapshots.push(snap)
    const ok =
      snap.breadcrumbSignals.length === 0 &&
      snap.expectedStructure &&
      snap.controls.hamburger &&
      snap.controls.searchButtons &&
      snap.controls.bell &&
      snap.controls.unreadBadge &&
      snap.controls.sidebarCollapse &&
      snap.controls.bottomNav &&
      snap.controls.sidebarLinks >= NAV_ITEMS[role].length &&
      snap.controls.accountLink &&
      snap.controls.pageHeading &&
      snap.controls.consoleClean
    step(role.toUpperCase(), path, ok,
      `text="${snap.headerText}", h1="${snap.pageHeading}", children=${snap.childCount}, signals=${snap.breadcrumbSignals.length}`)
  }
}

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (failed.length) for (const result of failed) console.log(`  x ${result.group} — ${result.label} ${result.detail}`)

/* ---------------------------------------------------------- write report */
const tableRows = snapshots.map((snap) => {
  const status = snap.breadcrumbSignals.length === 0 && snap.expectedStructure ? 'PASS' : 'FAIL'
  const signals = snap.breadcrumbSignals.length ? snap.breadcrumbSignals.join(', ') : 'none'
  return `| ${snap.role} | \`${snap.path}\` | \`${snap.headerText}\` | \`${snap.pageHeading}\` | ${snap.childCount} | ${snap.controls.sidebarLinks} | ${signals} | ${status} |`
}).join('\n')

const htmlSections = snapshots.map((snap) => `### ${snap.role} · \`${snap.path}\`

Buttons: ${snap.buttonLabels.map((label) => `\`${label}\``).join(', ')}  
SVGs: ${snap.svgClasses.split(' | ').map((cls) => `\`${cls}\``).join(', ')}

\`\`\`html
${snap.html.replace(/></g, '>\n<')}
\`\`\``).join('\n\n')

const report = `# Rendered workspace header audit

Generated by \`npm run audit:header\` on ${DATE} · Branch: \`${BRANCH}\`

## Expected navbar structure

Left: responsive hamburger / sidebar toggle. Right: search, the separate mobile
search action, notification bell + unread counter and the other existing
functional header controls. There must be **no** workspace badge, breadcrumb
arrow, current page title or profile identity block, and **no** replacement
element or empty spacer where the breadcrumb used to be. Page headings and
sidebar navigation remain in their own surfaces.

## Source inspection

- \`src/layouts/WorkspaceLayout.jsx\` is the only shared workspace header. Its
  \`useMemo\` crumb derivation, \`ChevronRight\` import and the entire breadcrumb
  container were removed. \`activeNavItem\` remains solely to highlight the
  sidebar entry.
- Scanned \`${sourceFiles.length}\` JS/JSX files and found
  \`${headerBlocks.length}\` \`<header>\` blocks across \`${headerFiles.length}\`
  files: ${headerFiles.map((file) => `\`${file}\``).join(', ')}.
- Forbidden breadcrumb patterns inside any header block: **${offendingHeaders.length}**.
- Remaining \`ChevronRight\` references outside header blocks:
  ${chevronFiles.length ? chevronFiles.map((file) => `\`${file}\``).join(', ') : 'none'}
  (public-site carousel / icon definition only, not the workspace navbar).
- Other header blocks belong to the landing page or full-screen exam/classroom
  session views; they do not render the shared workspace breadcrumb.
- \`ROLE_LABELS[role]\` and \`tracking-[0.14em]\` still appear in sidebar/drawer
  workspace labels and navigation \`aria-label\`s, which are intentionally kept;
  none appear inside a \`<header>\` block.

## Rendered checks

| Role | Route | Header text | Page \`h1\` | Header children | Sidebar links | Breadcrumb signals | Status |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
${tableRows}

Header children are the hamburger button and the single \`ml-auto\` controls
group. Header text is limited to the visible Search button, its shortcut and
the unread counter; no role label or page title appears in the navbar.

## Captured rendered headers

These are the actual \`<header>\` elements produced by React for each route.

${htmlSections}

## Limits

jsdom has no layout engine. This captures and validates the real rendered DOM
structure, attributes, text and console cleanliness — not CSS pixels. Responsive
class behaviour is covered by \`npm run audit:responsive\`.
`

writeFileSync(join(ROOT, 'docs/VYUH_HEADER_AUDIT.md'), report)

await server.close()
if (root) root.unmount()
process.exit(failed.length ? 1 : 0)

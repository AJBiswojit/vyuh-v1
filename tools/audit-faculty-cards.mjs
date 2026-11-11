/* Student → Doubts → Ask Faculty card audit.

   Verifies the three existing faculty portraits are mapped correctly, the
   cards preserve service data, every card/Ask action selects the right faculty
   and subject, image failures fall back gracefully, and the layout uses
   responsive/focus-safe classes.

   node tools/audit-faculty-cards.mjs */

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

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
const { doubtService } = await load('/src/services/doubt.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const { EXPERTS } = await load('/src/content.js')
const { SUBJECTS } = await load('/src/data/mock/subjects.mock.js')
const SUBJECT_BY_ID = new Map(SUBJECTS.map((subject) => [subject.id, subject]))

const componentSource = readFileSync(join(ROOT, 'src/pages/student/DoubtsPage.jsx'), 'utf8')
const expertsSource = readFileSync(join(ROOT, 'src/components/Experts.jsx'), 'utf8')

/* Expected values come from the user's brief; the actual mapping is verified
   against the repository's existing EXPERTS data, not asserted in the UI. */
const EXPECTED = [
  { id: 'fac_001', name: 'Aarav Mishra', subject: 'Physics', subjectId: 'sub_phy', photo: '/assets/expert-01.webp', availability: 'available' },
  { id: 'fac_002', name: 'Rohan Sen', subject: 'Chemistry', subjectId: 'sub_chem', photo: '/assets/expert-02.webp', availability: 'busy' },
  { id: 'fac_003', name: 'Vikram Das', subject: 'Mathematics', subjectId: 'sub_math', photo: '/assets/expert-03.webp', availability: 'available' },
]
const EXPERT_MAP = new Map(EXPERTS.map((expert) => [expert.name, expert]))

const results = []
const step = (group, label, ok, detail = '') => {
  results.push({ group, label, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${group} — ${label}${detail ? ` (${detail})` : ''}`)
}
const cleanText = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim()
const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const consoleClean = () => sink.errors.length === 0 && sink.uncaught.length === 0

function selectByLabel(labelText) {
  const label = [...rootEl.querySelectorAll('label')].find((node) => cleanText(node).includes(labelText))
  if (!label) return null
  const id = label.getAttribute('for')
  return id ? rootEl.querySelector(`select[id="${id}"]`) : null
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

/* ------------------------------------------------------------ source checks */
const mappingOk = EXPECTED.every((entry) => {
  const expert = EXPERT_MAP.get(entry.name)
  return expert?.image === entry.photo &&
    String(expert.role).toLowerCase().includes(entry.subject.toLowerCase()) &&
    existsSync(join(ROOT, 'public', entry.photo.replace(/^\//, '')))
})
const expertsUsesAssets = /expert\.image/.test(expertsSource) && /\$\{expert\.name\}/.test(expertsSource)
step('shared', 'existing expert mapping and files are correct',
  mappingOk && expertsUsesAssets,
  EXPECTED.map((entry) => `${entry.name} → ${entry.photo}`).join(', '))

const reusesData = /import \{ EXPERTS \} from '\.\.\/\.\.\/content\.js'/.test(componentSource) &&
  /doubtService\.getFacultyDirectoryForStudent/.test(componentSource) &&
  !/Aarav|Rohan|Vikram|expert-0[123]\.webp/.test(componentSource)
step('shared', 'no hardcoded faculty records or image paths in the component', reusesData)

const responsiveClasses = /lg:grid-cols-\[minmax\(0,1fr\)_320px\]/.test(componentSource) &&
  /xl:grid-cols-\[minmax\(0,1fr\)_360px\]/.test(componentSource) &&
  /flex-wrap/.test(componentSource) &&
  /focus-visible:ring/.test(componentSource) &&
  /object-cover/.test(componentSource) &&
  /rounded-full/.test(componentSource) &&
  /min-w-0/.test(componentSource) &&
  /shrink-0/.test(componentSource)
step('shared', 'responsive, crop and focus/hover classes are present', responsiveClasses)

/* -------------------------------------------------------------- render */
window.localStorage.clear()
window.sessionStorage.clear()
mockStorage.resetStore()
const login = await authService.login({
  email: 'ananya.sharma@student.vyuhacademy.edu.in',
  password: authService.demoPassword(),
})
const directory = await doubtService.getFacultyDirectoryForStudent(login.user.id)
await mount('/student/doubts?tab=faculty')

const cards = [...rootEl.querySelectorAll('[data-faculty-card]')]
step('rendered', 'three faculty cards are rendered', cards.length === 3 && consoleClean(), `cards=${cards.length}`)

for (const entry of EXPECTED) {
  const group = entry.name.toUpperCase()
  const faculty = directory.find((item) => item.id === entry.id)
  const card = cards.find((node) => node.getAttribute('data-faculty-name') === entry.name)
  const img = card?.querySelector('img[data-faculty-photo]')
  const cardText = cleanText(card)
  const photoClass = img?.getAttribute('class') || ''

  step(group, 'correct photograph, circular crop and identity data',
    Boolean(card && faculty && img) &&
    img.getAttribute('src') === entry.photo &&
    img.getAttribute('data-faculty-photo') === entry.photo &&
    /rounded-full/.test(photoClass) && /object-cover/.test(photoClass) &&
    /h-\[68px\]/.test(photoClass) && /w-\[68px\]/.test(photoClass) &&
    cardText.includes(entry.name) &&
    cardText.includes(faculty.designation) &&
    cardText.includes(entry.subject) &&
    cardText.includes(faculty.officeHours) &&
    Boolean(card.querySelector('[data-ask-action]')),
    `src=${img?.getAttribute('src')}`)

  const status = card?.querySelector('[data-availability]')
  const badge = status?.querySelector('.badge')
  const toneOk = entry.availability === 'available'
    ? /good-100/.test(badge?.getAttribute('class') || '')
    : /warn-100/.test(badge?.getAttribute('class') || '')
  step(group, 'availability uses icon + text + correct tone (not colour alone)',
    status?.getAttribute('data-availability') === entry.availability &&
    cleanText(status).includes(faculty.availability) &&
    Boolean(status.querySelector('svg')) &&
    toneOk,
    `status=${status?.getAttribute('data-availability')}, text="${cleanText(status)}"`)

  /* Click the whole card / Ask action and verify the modal selects the right
     faculty, subject and that subject's first topic. */
  card?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  await sleep(500)
  const dialog = rootEl.querySelector('[role="dialog"]')
  const facultySelect = selectByLabel('Faculty (optional)')
  const subjectSelect = selectByLabel('Subject')
  const topicSelect = selectByLabel('Topic')
  const firstTopicId = SUBJECT_BY_ID.get(entry.subjectId)?.topics?.[0]?.id
  const selectedOk = Boolean(dialog && firstTopicId) &&
    cleanText(dialog.querySelector('h2')).includes('Ask faculty') &&
    facultySelect?.value === entry.id &&
    subjectSelect?.value === entry.subjectId &&
    topicSelect?.value === firstTopicId
  step(group, 'card / Ask action selects correct faculty, subject and topic',
    selectedOk,
    `faculty=${facultySelect?.value}, subject=${subjectSelect?.value}, topic=${topicSelect?.value}`)
  rootEl.querySelector('button[aria-label="Close dialog"]')?.dispatchEvent(
    new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
  )
  await sleep(300)

  /* Simulate a broken image and assert the initials fallback. */
  const currentCard = [...rootEl.querySelectorAll('[data-faculty-card]')].find((node) => node.getAttribute('data-faculty-name') === entry.name)
  const currentImg = currentCard?.querySelector('img[data-faculty-photo]')
  currentImg?.dispatchEvent(new window.Event('error'))
  await sleep(250)
  const fallback = currentCard?.querySelector('[data-faculty-fallback="true"]')
  step(group, 'broken image falls back to initials avatar',
    Boolean(fallback) &&
    !currentCard.querySelector('img[data-faculty-photo]') &&
    Boolean(fallback.querySelector('[data-identity-avatar]')) &&
    cleanText(fallback).length > 0)
}

step('rendered', 'no console errors during card interactions', consoleClean())

const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (failed.length) for (const result of failed) console.log(`  x ${result.group} — ${result.label} ${result.detail}`)
console.log('\nExact asset mapping:')
for (const entry of EXPECTED) console.log(`  · ${entry.name} (${entry.subject}) → ${entry.photo}`)

await server.close()
if (root) root.unmount()
process.exit(failed.length ? 1 : 0)

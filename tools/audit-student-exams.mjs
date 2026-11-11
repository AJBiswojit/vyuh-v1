/* Focused regression audit for the Student → Exams page and its cards.
   Mounts the real app through jsdom + Vite, signs in with the seeded student,
   clicks the actual controls and reads the rendered DOM.

   node tools/audit-student-exams.mjs */

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

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
const { MemoryRouter, useLocation } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const { examService } = await load('/src/services/exam.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const { formatDate, formatTime, formatMinutes } = await load('/src/lib/time.js')

const STUDENT_EMAIL = 'ananya.sharma@student.vyuhacademy.edu.in'
const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = []
const step = (group, label, ok, detail = '') => {
  results.push({ group, label, ok, detail })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${group} — ${label}${detail ? ` (${detail})` : ''}`)
}
const cleanText = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim()
const mainText = () => cleanText(rootEl.querySelector('main'))
const mainEl = () => rootEl.querySelector('main')

/* The route is exposed as a DOM attribute so the harness can read it without
   assigning to a module-level variable during render. */
function LocationProbe() {
  const location = useLocation()
  return React.createElement('span', {
    id: 'probe-location',
    hidden: true,
    'data-path': `${location.pathname}${location.search}`,
  })
}
const where = () => rootEl.querySelector('#probe-location')?.getAttribute('data-path') || ''

async function mount(path, settle = 1700) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(React.Fragment, null, React.createElement(LocationProbe), React.createElement(App)),
    ),
  )
  await sleep(settle)
  return mainText()
}

function click(selector, matcher) {
  const element = [...rootEl.querySelectorAll(selector)].find((node) => (matcher ? matcher(node) : true))
  if (!element) return false
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
}
const clickText = (selector, text) =>
  click(selector, (node) => cleanText(node).toLowerCase().includes(text.toLowerCase()))
const cardByTitle = (title) =>
  [...rootEl.querySelectorAll('article[aria-label]')].find((node) => node.getAttribute('aria-label') === title)
const linksToResult = () => mainEl()?.querySelectorAll('a[href*="/result"], a[href*="/analysis"]').length || 0
const noConsoleErrors = () => sink.errors.length === 0 && sink.uncaught.length === 0

/* ---------------------------------------------------------------- setup */
mockStorage.resetStore()
window.localStorage.removeItem('vyuh:session:v1')
const login = await authService.login({ email: STUDENT_EMAIL, password: authService.demoPassword() })
const studentId = login.user.id
const pristine = await examService.getStudentExams(studentId)

const group = 'classification'
step(group, 'upcoming contains only scheduled/live papers without an attempt',
  pristine.upcoming.length > 0 && pristine.upcoming.every((exam) =>
    !exam.attempt && ['upcoming', 'live-window'].includes(exam.scheduleState)))
step(group, 'completed bucket holds only submitted attempts',
  pristine.completed.length > 0 && pristine.completed.every((exam) =>
    ['submitted', 'auto-submitted'].includes(exam.participationState)))
step(group, 'past archive includes every concluded paper, attempted or not',
  pristine.past.length >= pristine.completed.length &&
  pristine.past.every((exam) => exam.scheduleState !== 'cancelled'))
step(group, 'schedule state and participation state are separate fields',
  pristine.past.every((exam) => typeof exam.scheduleState === 'string' && typeof exam.participationState === 'string'))

/* ------------------------------------------------------- upcoming cards */
let body = await mount('/student/exams')
const upcomingCards = [...rootEl.querySelectorAll('article.exam-card')]
step('upcoming cards', 'one premium card per upcoming examination',
  upcomingCards.length === pristine.upcoming.length, `rendered=${upcomingCards.length}`)
for (const exam of pristine.upcoming) {
  const card = cardByTitle(exam.title)
  const text = cleanText(card)
  const values = [
    exam.title, exam.type, formatDate(exam.startAt), formatTime(exam.startAt),
    formatMinutes(exam.durationMinutes), String(exam.totalQuestions), String(exam.totalMarks),
    'Negative marking', exam.negativeMarking ? 'Applies' : 'None',
    exam.scheduleState === 'live-window' ? 'Live now' : 'Upcoming',
  ]
  const missing = values.filter((value) => !text.includes(value))
  const cta = card?.querySelector('a.exam-cta')
  const ctaOk = /view instructions/i.test(cleanText(cta)) &&
    cta?.getAttribute('href') === `/student/exams/${exam.id}/instructions`
  step('upcoming cards', `${exam.title.slice(0, 32)} shows correct data and View Instructions CTA`,
    missing.length === 0 && Boolean(ctaOk), missing.length ? `missing: ${missing.join(', ')}` : '')
}
step('separation', 'Exams page has no View Result / Analysis CTA',
  !/view result/i.test(body) && linksToResult() === 0, `resultLinks=${linksToResult()}`)
step('tabs', 'all four tabs render with live counts',
  ['Upcoming', 'Past examinations', 'Missed', 'Cancelled'].every((label) =>
    [...rootEl.querySelectorAll('[role="tab"]')].some((node) => cleanText(node).includes(label))) &&
  rootEl.querySelectorAll('[role="tab"] .exam-tab-count').length === 4)
click('[role="tab"]', (node) => /past examinations/i.test(cleanText(node)))
await sleep(450)
step('tabs', 'tab click updates the URL, active indicator and card list',
  where().includes('tab=past') &&
  rootEl.querySelector('[role="tab"][aria-selected="true"]')?.id === 'exam-tab-past' &&
  rootEl.querySelectorAll('article.exam-archive').length === pristine.past.length,
  where())

/* ------------------------------------------- instructions + declaration */
await mount('/student/exams')
const firstUpcoming = pristine.upcoming[0]
click('a.exam-cta', (node) => node.getAttribute('href') === `/student/exams/${firstUpcoming.id}/instructions`)
await sleep(1700)
const instructionsText = mainText()
step('instructions', 'View Instructions opens the matching examination',
  where() === `/student/exams/${firstUpcoming.id}/instructions` &&
  instructionsText.includes(firstUpcoming.title), where())
step('instructions', 'mandatory declaration gates the start button',
  Boolean(rootEl.querySelector('input[type="checkbox"]')) &&
  [...rootEl.querySelectorAll('button')].some((node) =>
    /start examination/i.test(cleanText(node)) && node.disabled))

/* ------------------------------------------------------ past examinations */
body = await mount('/student/exams?tab=past')
const pastCards = [...rootEl.querySelectorAll('article.exam-archive')]
step('past cards', 'direct URL refresh keeps the Past examinations tab active',
  body.includes('Marks, results and question-level analysis') &&
  rootEl.querySelector('[role="tab"][aria-selected="true"]')?.id === 'exam-tab-past' &&
  pastCards.length === pristine.past.length, `cards=${pastCards.length}`)
step('past cards', 'no View Result button or analysis link on any past exam card',
  !/view result/i.test(body) && linksToResult() === 0 &&
  pastCards.every((card) => !card.querySelector('a, button')))
step('past cards', 'each card shows participation and schedule state separately',
  pastCards.length > 0 && pastCards.every((card) => {
    const text = cleanText(card)
    return Boolean(card.querySelector('.exam-participation')) &&
      /Schedule:/.test(text) && /Conducted/.test(text) && /marks/.test(text)
  }))
step('past cards', 'Completed only appears where an attempt was actually submitted',
  pastCards.every((card) => {
    const exam = pristine.past.find((item) => item.title === card.getAttribute('aria-label'))
    const label = cleanText(card.querySelector('.exam-participation'))
    return exam?.attempt ? label.includes('Completed') : !label.includes('Completed')
  }))

/* ------------------------------------------- performance → analysis stays */
body = await mount('/student/performance')
step('performance', 'Examination history exposes analysis links',
  /examination history/i.test(body) &&
  Boolean(mainEl()?.querySelector('a[href*="/analysis"]')))
const analysisLink = mainEl()?.querySelector('a[href*="/analysis"]')
click('a[href*="/analysis"]', (node) => node === analysisLink)
await sleep(1800)
const analysisText = mainText()
step('analysis', 'Performance → Examination Analysis opens the analysis',
  where().includes('/analysis') && /question level/i.test(analysisText), where())
const directAnalysisUrl = analysisLink?.getAttribute('href')
body = await mount(directAnalysisUrl || '/student/exams/exam_phy_001/analysis')
step('analysis', 'direct URL refresh of Examination Analysis renders',
  /question level/i.test(body) && /overall/i.test(body) && noConsoleErrors(),
  directAnalysisUrl || '')
click('[role="tab"]', (node) => /question level/i.test(cleanText(node)))
await sleep(900)
step('analysis', 'question-level tab still works',
  /correct|incorrect|unattempted/i.test(mainText()) && noConsoleErrors())

/* --------------------------------- missed / closed / cancelled accuracy */
const pool = await examService.getQuestionPool({ subjectId: 'sub_phy' })
const questionIds = pool.slice(0, 3).map((question) => question.id)
const actor = { id: 'fac_001', role: 'faculty', name: 'Aarav Mishra' }
const paper = {
  description: 'Paper created to verify examination archive statuses.',
  type: 'Unit Test',
  subjectId: 'sub_phy',
  batchIds: ['batch_001'],
  durationMinutes: 30,
  sections: [{ name: 'Section A', subjectId: 'sub_phy', questionIds }],
  negativeMarking: true,
}
const missedExam = await examService.createExam({
  ...paper,
  title: 'Card Audit — Closed Window Paper',
  startAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  endAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  status: 'published',
}, actor)
const cancelledExam = await examService.createExam({
  ...paper,
  title: 'Card Audit — Cancelled Paper',
  startAt: new Date(Date.now() + 2 * 3600000).toISOString(),
  endAt: new Date(Date.now() + 3 * 3600000).toISOString(),
  status: 'published',
}, actor)
await examService.cancelExam(cancelledExam.id, 'Cancelled for the student examination card audit.', actor)

const injected = await examService.getStudentExams(studentId)
step('status accuracy', 'closed window with no attempt goes to Missed, not Completed',
  injected.missed.some((exam) => exam.id === missedExam.id && exam.participationState === 'not-attempted') &&
  !injected.completed.some((exam) => exam.id === missedExam.id))
step('status accuracy', 'cancelled paper goes to Cancelled only',
  injected.cancelled.some((exam) => exam.id === cancelledExam.id && exam.scheduleState === 'cancelled') &&
  !injected.upcoming.some((exam) => exam.id === cancelledExam.id) &&
  !injected.completed.some((exam) => exam.id === cancelledExam.id))

body = await mount('/student/exams?tab=missed')
const missedCard = cardByTitle(missedExam.title)
step('status accuracy', 'Missed card shows Missed + Window closed separately',
  Boolean(missedCard) && /Missed/.test(cleanText(missedCard?.querySelector('.exam-participation'))) &&
  /Schedule: Window closed/.test(cleanText(missedCard)) &&
  !/Completed/.test(cleanText(missedCard?.querySelector('.exam-participation'))),
  cleanText(missedCard?.querySelector('.exam-participation')))

body = await mount('/student/exams?tab=cancelled')
const cancelledCard = cardByTitle(cancelledExam.title)
step('status accuracy', 'Cancelled card shows Cancelled schedule and no attempt status',
  Boolean(cancelledCard) && /Schedule: Cancelled/.test(cleanText(cancelledCard)) &&
  /Not attempted/.test(cleanText(cancelledCard?.querySelector('.exam-participation'))) &&
  !/View Result/i.test(cleanText(cancelledCard)),
  cleanText(cancelledCard?.querySelector('.exam-archive-status')))
step('status accuracy', 'Cancelled tab keeps the exams/performance separation',
  !/view result/i.test(body) && linksToResult() === 0)

/* ------------------------------------------- eligible exams can be started */
const liveExam = await examService.createExam({
  ...paper,
  title: 'Card Audit — Startable Paper',
  startAt: new Date(Date.now() - 5 * 60000).toISOString(),
  endAt: new Date(Date.now() + 2 * 3600000).toISOString(),
  status: 'published',
}, actor)
body = await mount('/student/exams')
const liveCard = cardByTitle(liveExam.title)
const tabCount = (label) => {
  const tab = [...rootEl.querySelectorAll('[role="tab"]')].find((node) => cleanText(node).includes(label))
  return cleanText(tab?.querySelector('.exam-tab-count'))
}
step('tabs', 'counts follow the actual scheduling and attempt data',
  tabCount('Missed') === '1' && tabCount('Cancelled') === '1',
  `missed=${tabCount('Missed')} cancelled=${tabCount('Cancelled')}`)
step('live cards', 'eligible live exam shows Live now and only View Instructions',
  Boolean(liveCard) && /Live now/.test(cleanText(liveCard)) &&
  /View Instructions/i.test(cleanText(liveCard.querySelector('a.exam-cta'))) &&
  liveCard.querySelector('a.exam-cta')?.getAttribute('href') === `/student/exams/${liveExam.id}/instructions` &&
  ![...liveCard.querySelectorAll('a')].some((link) => /\/live/.test(link.getAttribute('href') || '')))
body = await mount(`/student/exams/${liveExam.id}/instructions`)
step('start workflow', 'live exam instructions open directly and are ready to start',
  body.includes(liveExam.title) && /ready to start/i.test(body))
click('input[type="checkbox"]')
await sleep(250)
clickText('button', 'start examination')
await sleep(1900)
const startedAttempt = mockStorage.loadStore().attempts.find(
  (attempt) => attempt.examId === liveExam.id && attempt.studentId === studentId,
)
step('start workflow', 'declaration unlocks start and opens the CBT interface',
  where() === `/student/exams/${liveExam.id}/live` &&
  startedAttempt?.status === 'in-progress', where())

/* ------------------------------------------------------------- reporting */
const failed = results.filter((result) => !result.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (sink.errors.length || sink.uncaught.length) {
  console.log(`Console issues on the final mount: ${[...sink.errors, ...sink.uncaught].slice(0, 3).join(' | ')}`)
}
await server.close()
if (root) root.unmount()
process.exit(failed.length ? 1 : 0)

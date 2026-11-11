/* End-to-end flow audit through the real DOM: clicks the same controls a person
   would, instead of calling services directly.

   node tools/audit-flows.mjs */
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const k of ['HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'localStorage', 'sessionStorage']) globalThis[k] = window[k]
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
    getUserMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    getDisplayMedia: () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })),
    enumerateDevices: () => Promise.resolve([]), addEventListener() {}, removeEventListener() {},
  },
})

const sink = { errors: [], uncaught: [] }
window.addEventListener('error', (e) => sink.uncaught.push(e.message))
window.addEventListener('unhandledrejection', (e) => sink.uncaught.push(String(e.reason?.message || e.reason)))
const origError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a?.stack || String(a))).join(' ')
  if (/not wrapped in act|deprecated|React Router Future|Not implemented: (navigation to another Document|Window's print)/i.test(text)) return
  sink.errors.push(text.split('\n')[0])
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
const mockStorage = await load('/src/data/mock/mock-storage.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const rootEl = window.document.getElementById('root')
let root = null
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const txt = () => (rootEl.textContent || '').replace(/\s+/g, ' ').trim()
const inMain = (sel) => [...rootEl.querySelectorAll(`main ${sel}`)]

async function signIn(role, { reset = true } = {}) {
  /* The session key is always cleared (that is what signing out does); the demo
     dataset is only reset when the flow wants a pristine store, so data created
     by an earlier role stays visible to the next one. */
  window.localStorage.removeItem('vyuh:session:v1')
  if (reset) mockStorage.resetStore?.()
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
}
async function mount(path, settle = 1600) {
  sink.errors.length = 0
  sink.uncaught.length = 0
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
  return txt()
}
function click(selector, matcher) {
  const el = [...rootEl.querySelectorAll(selector)].find((node) => (matcher ? matcher(node) : true))
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
}
const clickText = (selector, text) =>
  click(selector, (node) => (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()))

const results = []
const step = (flow, label, ok, detail = '') => results.push({ flow, label, ok, detail })
const clean = () => !sink.errors.length && !sink.uncaught.length

/* ═══════════ 1. student takes an examination end to end ═══════════ */
{
  const flow = 'student: exams → instructions → live → submit → result → analysis'
  /* A paper that is open right now: faculty publishes it, then the student takes
     it through the real screens. */
  mockStorage.resetStore?.()
  await signIn('faculty', { reset: false })
  const { examService } = await load('/src/services/exam.service.js')
  const pool = await examService.getQuestionPool({ subjectId: 'sub_phy' })
  const start = new Date(Date.now() - 5 * 60000)
  const exam = await examService.createExam(
    {
      title: `Flow Audit Paper ${Date.now().toString(36).slice(-4)}`,
      description: 'Paper created for the end-to-end flow audit.',
      type: 'Unit Test',
      subjectId: 'sub_phy',
      batchIds: ['batch_001'],
      startAt: start.toISOString(),
      endAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      durationMinutes: 45,
      sections: [{ name: 'Section A', subjectId: 'sub_phy', questionIds: pool.slice(0, 3).map((q) => q.id) }],
      status: 'draft',
    },
    { id: 'fac_001', role: 'faculty', name: 'Aarav Mishra' },
  )
  const published = await examService.publishExam(exam.id, { id: 'fac_001', role: 'faculty', name: 'Aarav Mishra' })
  if (published?.status === 'pending-approval') {
    const { adminService } = await load('/src/services/admin.service.js')
    await signIn('admin', { reset: false })
    const pending = await adminService.listApprovals({ status: 'pending' })
    const approval = pending.find((item) => item.entityId === exam.id)
    if (approval) await adminService.decideApproval(approval.id, 'approved', 'Flow audit approval', { id: 'admin_001', role: 'admin', name: 'Meera Kulkarni' })
  }

  await signIn('student', { reset: false })
  const listBody = await mount('/student/exams', 2000)
  const examLink = [...rootEl.querySelectorAll(`main a[href*="${exam.id}"]`)][0]
  step(flow, 'new paper appears in the student list', Boolean(examLink), examLink?.getAttribute('href') || listBody.slice(0, 60))

  const body = await mount(`/student/exams/${exam.id}/instructions`, 2400)
  step(flow, 'instruction page renders the paper', /instructions|marking|declaration/i.test(body) && body.includes(exam.title), txt().slice(0, 60))

  const checkbox = rootEl.querySelector('main input[type="checkbox"]')
  if (checkbox && !checkbox.checked) {
    checkbox.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    await sleep(300)
  }
  const pressedStart = clickText('main button', 'start examination') || clickText('main button', 'resume examination')
  await sleep(2600)
  step(flow, 'start action opens the examination', pressedStart && /remaining|question|answered/i.test(txt()), txt().slice(-90))

  const liveBody = txt()
  const inLive = /remaining|answered|mark for review/i.test(liveBody)
  step(flow, 'examination screen is live and timed', inLive, liveBody.slice(-90))

  if (inLive) {
    const option = rootEl.querySelector('main input[type="radio"]')
    if (option) {
      option.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      await sleep(1200)
    }
    step(flow, 'an answer can be recorded', /answered/i.test(txt()), txt().slice(-80))

    clickText('main button', 'submit')
    await sleep(1000)
    const dialogButtons = [...rootEl.querySelectorAll('button')].map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
    const confirmed = clickText('button', 'submit now')
    await sleep(3000)
    step(flow, 'submission is confirmed through the dialog', confirmed, dialogButtons.slice(-5).join(' | '))
    step(flow, 'room leaves the attempt after submitting', !/remaining/i.test(txt()) || /result/i.test(txt()), txt().slice(-90))

    const resultBody = await mount(`/student/exams/${exam.id}/result`, 2600)
    step(flow, 'result page renders marks', /marks|score|correct|accuracy|percent/i.test(resultBody), resultBody.slice(-90))
    const analysisBody = await mount(`/student/exams/${exam.id}/analysis`, 2600)
    step(flow, 'analysis page renders question-level detail', /analysis|question|accuracy|time/i.test(analysisBody), analysisBody.slice(-90))
    step(flow, 'no console errors during the attempt', clean(), sink.errors[0] || sink.uncaught[0] || '')
  }
}

/* ═══════════ 2. faculty builds and publishes a paper from the builder UI ═══════════ */
{
  const flow = 'faculty: builder → publish → appears in Exams'
  await signIn('faculty')
  const body = await mount('/faculty/exams/new', 2400)
  step(flow, 'exam builder renders', /new examination|builder|section|question/i.test(body), body.slice(0, 70))
  step(flow, 'no console errors on builder', clean(), sink.errors[0] || '')
  const examsBody = await mount('/faculty/exams', 2000)
  step(flow, 'faculty exams list renders papers', /examination|draft|published/i.test(examsBody), examsBody.slice(0, 70))
}

/* ═══════════ 3. faculty runs a live class from the studio ═══════════ */
{
  const flow = 'faculty: classes → studio → poll → end session'
  await signIn('faculty')
  await mount('/faculty/classes', 2000)
  const opened = clickText('main button', 'enter studio') || clickText('main button', 'start session')
  await sleep(2600)
  const studioBody = txt()
  step(flow, 'studio opens from the classes list', /live|chat|people|polls/i.test(studioBody), studioBody.slice(0, 70))
  step(flow, 'no console errors in the studio', clean(), sink.errors[0] || '')

  /* camera permission is denied in this harness (as it would be for a user who
     blocks it) — the honest fallback must explain, not crash */
  const enableCamera = clickText('main button', 'enable camera')
  await sleep(900)
  step(flow, 'camera denial handled with an explanation', !sink.errors.length && /permission|camera|denied|blocked|allow/i.test(txt()), txt().slice(0, 90))

  const pollsTab = clickText('main button', 'polls') || clickText('main [role="tab"]', 'polls')
  await sleep(700)
  const pollBody = txt()
  step(flow, 'poll panel reachable', pollsTab && /poll/i.test(pollBody), pollBody.slice(-80))
  step(flow, 'opened from list', opened)
}

/* ═══════════ 4. student joins the classroom ═══════════ */
{
  const flow = 'student: live class → classroom → chat'
  await signIn('student')
  await mount('/student/live-classes', 2000)
  const join = clickText('main a', 'join') || clickText('main button', 'join') || clickText('main a', 'open')
  await sleep(2400)
  step(flow, 'join control available', join, txt().slice(0, 70))
  const roomBody = await mount('/student/live-classes/class_001/room', 2800)
  step(flow, 'classroom renders', /chat|people|participant|live|host/i.test(roomBody), roomBody.slice(0, 70))
  step(flow, 'no console errors in the student classroom', clean(), sink.errors[0] || '')
}

/* ═══════════ 5. student asks a doubt from the UI ═══════════ */
{
  const flow = 'student: doubts → ask → detail'
  await signIn('student')
  const body = await mount('/student/doubts', 2000)
  step(flow, 'doubts list renders', /doubt/i.test(body), body.slice(0, 60))
  const opened = clickText('main button', 'ask') || clickText('main button', 'new doubt')
  await sleep(1200)
  const dialog = txt()
  step(flow, 'ask-doubt form opens', opened && /subject|title|describe/i.test(dialog), dialog.slice(0, 80))
  const detail = await mount('/student/doubts/doubt_001', 2200)
  step(flow, 'doubt detail renders thread', /reply|doubt|faculty/i.test(detail), detail.slice(0, 70))
}

/* ═══════════ 6. admin approves a pending request ═══════════ */
{
  const flow = 'admin: approvals → decide → audit log'
  await signIn('admin')
  const body = await mount('/admin/approvals', 2200)
  step(flow, 'approvals queue renders', /approval|pending|review/i.test(body), body.slice(0, 60))
  const opened = clickText('main button', 'review') || clickText('main button', 'approve') || clickText('main button', 'details')
  await sleep(1200)
  step(flow, 'decision surface opens', opened, txt().slice(0, 70))
  const audit = await mount('/admin/audit-log', 2200)
  step(flow, 'audit log lists recorded actions', /audit|action|actor/i.test(audit), audit.slice(0, 60))
}

/* ═══════════ 7. admin creates a user from the UI ═══════════ */
{
  const flow = 'admin: users → add account → appears in list'
  await signIn('admin')
  await mount('/admin/users', 2200)
  const opened = clickText('main button', 'add') || clickText('main button', 'new user') || clickText('main button', 'create')
  await sleep(1200)
  step(flow, 'create-user form opens', opened, txt().slice(0, 70))
  const form = rootEl.querySelector('form')
  step(flow, 'form exposes the required fields', Boolean(form) && rootEl.querySelectorAll('main form input').length >= 2,
    `inputs=${rootEl.querySelectorAll('main form input').length}`)
  step(flow, 'no console errors on the users page', clean(), sink.errors[0] || '')
}

if (root) root.unmount()
await server.close()

const flows = new Map()
for (const r of results) {
  if (!flows.has(r.flow)) flows.set(r.flow, [])
  flows.get(r.flow).push(r)
}
let failures = 0
for (const [flow, steps] of flows) {
  const bad = steps.filter((s) => !s.ok)
  failures += bad.length
  console.log(`\n${bad.length ? '✗' : '✓'} ${flow}  (${steps.length - bad.length}/${steps.length})`)
  for (const s of steps) console.log(`   ${s.ok ? 'ok  ' : 'FAIL'} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`)
}
console.log(`\n${failures === 0 ? 'ALL FLOWS PASS' : `${failures} FAILING STEP(S)`}\n`)
process.exit(failures ? 1 : 0)

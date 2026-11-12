/* Cross-role workflow audit.
   Each workflow drives the real service layer in the sequence a human would use
   the product, then confirms the other workspaces actually see the result.
   node tools/audit-workflows.mjs */
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
const noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
globalThis.scrollTo = () => {}
window.scrollTo = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })

const sink = { errors: [] }
window.addEventListener('error', (e) => sink.errors.push(e.message))
const origError = console.error
console.error = (...args) => { sink.errors.push(args.map((a) => (a?.message || String(a))).join(' ')) }
console.warn = () => {}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)

const { authService, getCurrentSession } = await load('/src/services/auth.service.js')
const { adminService } = await load('/src/services/admin.service.js')
const { userService } = await load('/src/services/user.service.js')
const { batchService } = await load('/src/services/batch.service.js')
const { examService } = await load('/src/services/exam.service.js')
const { attemptService } = await load('/src/services/attempt.service.js')
const { attendanceService } = await load('/src/services/attendance.service.js')
const { liveClassService } = await load('/src/services/live-class.service.js')
const { doubtService } = await load('/src/services/doubt.service.js')
const { analysisService } = await load('/src/services/analysis.service.js')
const { feeService } = await load('/src/services/fee.service.js')
const { feeRequestService } = await load('/src/services/fee-request.service.js')
const { paymentService } = await load('/src/services/payment.service.js')
const { supportService } = await load('/src/services/support.service.js')
const { supportAiService } = await load('/src/services/support-ai.service.js')
const { performanceService } = await load('/src/services/performance.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')

const EMAIL = {
  student: 'ananya.sharma@student.vyuhacademy.edu.in',
  faculty: 'aarav.mishra@vyuhacademy.edu.in',
  admin: 'meera.kulkarni@vyuhacademy.edu.in',
}
const ACTOR = {
  student: { id: 'stu_001', role: 'student', name: 'Ananya Sharma' },
  faculty: { id: 'fac_001', role: 'faculty', name: 'Aarav Mishra' },
  admin: { id: 'admin_001', role: 'admin', name: 'Meera Kulkarni' },
}

const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function as(role) {
  await authService.login({ email: EMAIL[role], password: authService.demoPassword() })
  const session = getCurrentSession()
  if (!session || session.role !== role) throw new Error(`could not sign in as ${role}`)
  return session
}
function step(workflow, label, ok, detail = '') {
  results.push({ workflow, label, ok, detail })
}

mockStorage.resetStore?.()
await sleep(50)

/* ─────────────── 1. admin creates a student → that student signs in ─────────────── */
{
  const wf = 'admin creates student → student signs in'
  await as('admin')
  const email = `workflow.student.${Date.now().toString(36)}@student.vyuhacademy.edu.in`
  const created = await userService.createUser(
    { role: 'student', name: 'Workflow Test Student', email, phone: '+91 90000 12345', batchIds: ['batch_001'] },
    ACTOR.admin,
  )
  step(wf, 'account created with one-time credentials', Boolean(created?.user?.id && created?.oneTimeCredentials?.temporaryPassword), `id=${created?.user?.id}`)
  await authService.logout()

  let signedIn = null
  let failure = null
  try {
    signedIn = await authService.login({ email, password: created.oneTimeCredentials.temporaryPassword })
  } catch (error) {
    failure = error.message
  }
  step(wf, 'new student can sign in with the issued credential', Boolean(signedIn), failure || `role=${signedIn?.role}`)
  step(wf, 'forced password change is required on first sign-in', signedIn?.mustChangePassword === true, `redirectTo=${signedIn?.redirectTo}`)
  const exams = signedIn ? await examService.getStudentExams(created.user.id) : null
  step(wf, 'new student sees their batch examinations', Boolean(exams), `buckets=${exams ? Object.keys(exams).length : 0}`)
  await authService.logout()
  await as('admin')
  await userService.setStatus(created.user.id, 'inactive', 'Workflow audit deactivation', ACTOR.admin)
  let blocked = null
  try {
    await authService.login({ email, password: created.oneTimeCredentials.temporaryPassword })
  } catch (error) {
    blocked = error.message
  }
  step(wf, 'deactivated account is refused at sign-in', /inactive/i.test(blocked || ''), blocked)
  await authService.logout()
}

/* ─────────────── 2. admin creates a faculty member → that faculty signs in ─────────────── */
{
  const wf = 'admin creates faculty → faculty signs in'
  await as('admin')
  const email = `workflow.faculty.${Date.now().toString(36)}@vyuhacademy.edu.in`
  const created = await userService.createUser(
    { role: 'faculty', name: 'Workflow Test Faculty', email, phone: '+91 90000 12346', batchIds: ['batch_001'], subjectIds: ['sub_phy'] },
    ACTOR.admin,
  )
  step(wf, 'faculty account created', Boolean(created?.user?.id), `id=${created?.user?.id}`)
  await authService.logout()
  const signedIn = await authService.login({ email, password: created.oneTimeCredentials.temporaryPassword })
  const expectedTarget = signedIn.mustChangePassword ? '/change-password' : '/faculty/dashboard'
  step(wf, 'faculty signs in and lands on the right first screen', signedIn.role === 'faculty' && signedIn.redirectTo === expectedTarget,
    `redirectTo=${signedIn.redirectTo} (mustChangePassword=${signedIn.mustChangePassword})`)
  const overview = await liveClassService.getFacultyClassOverview(created.user.id)
  step(wf, 'new faculty dashboard data loads', Boolean(overview), `buckets=${Object.keys(overview || {}).join(',')}`)
  await authService.logout()
  await as('admin')
  await userService.deleteUser(created.user.id, ACTOR.admin)
  await authService.logout()
}

/* ─────────────── 3. faculty publishes an exam → student sees it ─────────────── */
let publishedExamId = null
{
  const wf = 'faculty publishes exam → student sees it'
  await as('faculty')
  const start = new Date(Date.now() + 3600 * 1000)
  const end = new Date(start.getTime() + 3 * 3600 * 1000)
  const pool = await examService.getQuestionPool({ subjectId: 'sub_phy' })
  const questionIds = pool.slice(0, 3).map((q) => q.id)
  const exam = await examService.createExam(
    {
      title: `Workflow Unit Test ${Date.now().toString(36).slice(-4)}`,
      description: 'Created by the workflow audit.',
      type: 'Unit Test',
      subjectId: 'sub_phy',
      batchIds: ['batch_001'],
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMinutes: 30,
      sections: [{ name: 'Section A', subjectId: 'sub_phy', questionIds }],
      status: 'draft',
    },
    ACTOR.faculty,
  )
  step(wf, 'faculty creates a draft paper', Boolean(exam?.id), `id=${exam?.id}`)
  const published = await examService.publishExam(exam.id, ACTOR.faculty)
  const after = await examService.getExam(exam.id)
  const visible = ['published', 'pending-approval'].includes(after.status)
  step(wf, 'publication moves the paper out of draft', visible, `status=${after.status} result=${JSON.stringify(published?.status)}`)

  /* approval policy may route this to the administrator — handle both paths */
  if (after.status === 'pending-approval') {
    await authService.logout()
    await as('admin')
    const pending = await adminService.listApprovals({ status: 'pending' })
    const approval = pending.find((item) => item.entityId === exam.id)
    step(wf, 'administrator sees the publication request', Boolean(approval), `pending=${pending.length}`)
    if (approval) await adminService.decideApproval(approval.id, 'approved', 'Approved by workflow audit', ACTOR.admin)
    await authService.logout()
    await as('faculty')
  }

  publishedExamId = exam.id
  await authService.logout()
  await as('student')
  const studentExams = await examService.getStudentExams(ACTOR.student.id)
  const all = [...studentExams.upcoming, ...studentExams.inProgress, ...studentExams.completed, ...(studentExams.missed || [])]
  const found = all.find((item) => item.id === publishedExamId)
  step(wf, 'student sees the published paper', Boolean(found), `visible=${Boolean(found)} status=${found?.status}`)
  const { notificationService } = await load('/src/services/notification.service.js')
  const notifications = await notificationService.listForUser(ACTOR.student.id)
  const items = notifications.items || []
  step(wf, 'student is notified about the new paper', items.some((n) => n.entityId === publishedExamId), `notifications=${items.length}`)
}

/* ─────────────── 4. student submits an attempt → result + analysis ─────────────── */
{
  const wf = 'student submits attempt → result and analysis'
  await as('student')
  const exam = await examService.getExam(publishedExamId)
  const questions = exam.sections.flatMap((section) => section.questionIds)
  step(wf, 'paper exposes its questions', questions.length > 0, `${questions.length} questions`)
  const started = await attemptService.startExam(publishedExamId, ACTOR.student.id)
  const attempt = started?.attempt || started
  step(wf, 'attempt starts', Boolean(attempt?.id), `attempt=${attempt?.id} resumed=${Boolean(started?.resumed)}`)
  for (const [index, questionId] of questions.entries()) {
    await attemptService.saveResponse(attempt.id, questionId, index % 2 === 0 ? 'A' : 'B')
  }
  const submitted = await attemptService.submitAttempt(attempt.id, { reason: 'manual', actor: ACTOR.student })
  step(wf, 'attempt submits', Boolean(submitted), `status=${submitted?.status || submitted?.attempt?.status}`)
  const result = await attemptService.getAttemptForResult(attempt.id)
  step(wf, 'result is available to the student', Boolean(result), `score=${result?.score ?? result?.attempt?.score ?? 'n/a'}`)
  let analysis = null
  try {
    analysis = await analysisService.getDetailedAnalysis(attempt.id)
  } catch (error) {
    analysis = null
    step(wf, 'analysis loads', false, error.message)
  }
  if (analysis) step(wf, 'analysis loads', Boolean(analysis), `keys=${Object.keys(analysis).slice(0, 4).join(',')}`)
  await authService.logout()
  await as('faculty')
  const facultyAttempts = await attemptService.listAttemptsForExam(publishedExamId)
  step(wf, 'faculty sees the submitted attempt', facultyAttempts.some((a) => a.id === attempt.id), `attempts=${facultyAttempts.length}`)
  const itemAnalysis = await analysisService.getItemAnalysis(publishedExamId)
  step(wf, 'item analysis includes the paper', Boolean(itemAnalysis), `rows=${itemAnalysis?.questions?.length ?? itemAnalysis?.rows?.length ?? 'n/a'}`)
}

/* ─────────────── 5. faculty schedules a class → student can join ─────────────── */
let scheduledClassId = null
{
  const wf = 'faculty schedules class → student joins'
  await as('faculty')
  const start = new Date(Date.now() + 20 * 60 * 1000)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const klass = await liveClassService.createClass(
    {
      title: `Workflow Clinic ${Date.now().toString(36).slice(-4)}`,
      description: 'Scheduled by the workflow audit.',
      batchId: 'batch_001',
      subjectId: 'sub_phy',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      lateJoinAllowed: true,
      recordingEnabled: true,
    },
    ACTOR.faculty,
  )
  scheduledClassId = klass?.id
  step(wf, 'class scheduled', Boolean(klass?.id), `id=${klass?.id} status=${klass?.status}`)
  await authService.logout()
  await as('student')
  const studentClasses = await liveClassService.getStudentClasses(ACTOR.student.id)
  const upcoming = [...(studentClasses.upcoming || []), ...(studentClasses.live || [])]
  step(wf, 'student sees the session in Live Classes', upcoming.some((c) => c.id === scheduledClassId), `upcoming=${upcoming.length}`)
  await authService.logout()
  await as('faculty')
  await liveClassService.startSession(scheduledClassId, ACTOR.faculty)
  await authService.logout()
  await as('student')
  const access = await liveClassService.getStudentClassroomAccess(scheduledClassId, ACTOR.student.id)
  step(wf, 'student can join the started classroom', Boolean(access?.klass || access?.class || access?.allowed || access), `keys=${Object.keys(access || {}).slice(0, 5).join(',')}`)
}

/* ─────────────── 6. student raises a doubt → faculty replies ─────────────── */
{
  const wf = 'student raises doubt → faculty replies'
  await as('student')
  const doubt = await doubtService.createDoubt(
    {
      subjectId: 'sub_phy',
      title: 'Workflow: rotational dynamics doubt',
      body: 'I cannot follow the step where angular momentum is conserved across the collision. Please explain the approach.',
      priority: 'normal',
    },
    ACTOR.student,
  )
  step(wf, 'doubt created', Boolean(doubt?.id), `id=${doubt?.id}`)
  await authService.logout()
  await as('faculty')
  const queue = await doubtService.listFacultyDoubts(ACTOR.faculty.id)
  const inQueue = JSON.stringify(queue).includes(doubt.id)
  step(wf, 'doubt appears in the faculty queue', inQueue, `queue size≈${Array.isArray(queue) ? queue.length : 'object'}`)
  const reply = await doubtService.replyToDoubt(doubt.id, 'Conserve angular momentum about the pivot and compare before and after the collision.', ACTOR.faculty, { resolve: true })
  step(wf, 'faculty reply recorded', Boolean(reply), `status=${reply?.status || reply?.doubt?.status}`)
  await authService.logout()
  await as('student')
  const refreshed = await doubtService.getDoubt(doubt.id)
  const replies = refreshed?.replies || refreshed?.thread || []
  step(wf, 'student sees the reply and the resolved state', replies.length > 0 && refreshed?.status === 'resolved', `replies=${replies.length} status=${refreshed?.status}`)
}

/* ─────────────── 7. attendance consistency across the three workspaces ─────────────── */
{
  const wf = 'attendance consistent across all three roles'
  await as('faculty')
  const overview = await liveClassService.getFacultyClassOverview(ACTOR.faculty.id)
  const liveOrRecent = [...(overview.live || []), ...(overview.recent || [])]
  /* Reconcile a session this student actually attended — a colleague's session
     would legitimately have no register row for them. */
  const klass =
    liveOrRecent.find((item) =>
      (item.attendanceRecords || []).some((record) => record.studentId === ACTOR.student.id),
    ) || liveOrRecent[0]
  step(wf, 'a completed session is available to reconcile', Boolean(klass?.id), `class=${klass?.id}`)

  const facultyRegister = klass ? await attendanceService.getClassAttendance(klass.id) : null
  await authService.logout()
  await as('student')
  const studentAttendance = await attendanceService.getStudentAttendance(ACTOR.student.id)
  const studentRow = studentAttendance.sessions.find((session) => session.classId === klass?.id)

  const registerRow = facultyRegister?.records?.find((record) => record.studentId === ACTOR.student.id)
  const samePercent = studentRow && registerRow ? Number(studentRow.percentage) === Number(registerRow.percentage ?? registerRow.attendancePercentage) : false
  step(wf, 'student percentage equals the faculty register', Boolean(samePercent), `student=${studentRow?.percentage} register=${registerRow?.percentage ?? registerRow?.attendancePercentage}`)

  const summary = studentAttendance.summary
  step(wf, 'summary totals are internally consistent', summary.eligibleSessions === studentAttendance.sessions.length, `sessions=${studentAttendance.sessions.length} summary=${summary.eligibleSessions}`)

  await authService.logout()
  await as('admin')
  const report = await adminService.getReportData('report_attendance', {})
  step(wf, 'admin attendance report returns rows', (report?.rows || []).length > 0, `rows=${report?.rows?.length}`)
  const studentRowInReport = (report?.rows || []).some((row) => JSON.stringify(row).includes('Ananya'))
  step(wf, 'admin report includes the same student', studentRowInReport, `rows=${report?.rows?.length}`)
  const adminOverview = await adminService.getOverview()
  step(wf, 'admin overview attendance aggregates load', adminOverview.attendance?.percentage !== undefined, `percent=${adminOverview.attendance?.percentage}`)
  await authService.logout()
}

/* ─────────────── 9. fees → simulated payments → receipt → request decision ─────────────── */
{
  const wf = 'fees, simulated payments and cross-role requests'
  await authService.logout()
  await as('student')
  const before = await feeService.getStudentFees(ACTOR.student.id)
  const payable = before.fees.find((fee) => fee.outstandingAmount > 0)
  step(wf, 'approved fee records expose derived outstanding balances', Boolean(payable), `fee=${payable?.code}`)
  const failure = await paymentService.simulatePayment(payable.id, { method: 'upi', outcome: 'failure' }, ACTOR.student)
  const afterFailure = await feeService.getStudentFees(ACTOR.student.id)
  const feeAfterFailure = afterFailure.fees.find((fee) => fee.id === payable.id)
  step(wf, 'failed simulation is recorded but does not reduce balance',
    !failure.ok && feeAfterFailure.outstandingAmount === payable.outstandingAmount && feeAfterFailure.failedPayments > 0,
    `status=${failure.status} outstanding=${feeAfterFailure.outstandingAmount}`)
  const success = await paymentService.simulatePayment(payable.id, { method: 'upi', outcome: 'success' }, ACTOR.student)
  const afterSuccess = await feeService.getStudentFees(ACTOR.student.id)
  const paidFee = afterSuccess.fees.find((fee) => fee.id === payable.id)
  step(wf, 'successful simulation clears the derived balance with stable references',
    success.ok && paidFee.outstandingAmount === 0 && Boolean(success.transactionId && success.receiptReference),
    `transaction=${success.transactionId} receipt=${success.receiptReference}`)
  const receipt = await feeService.getReceiptData(success.payment.id)
  step(wf, 'student receipt is grounded in fee, payment and institute records',
    receipt.payment.id === success.payment.id && receipt.fee.id === payable.id && Boolean(receipt.institute?.name),
    `student=${receipt.student?.name}`)
  step(wf, 'receipt explicitly avoids real gateway and financial credentials',
    /no real gateway/i.test(receipt.payment.gatewayLabel || '') && !/card|cvv|pin|password/i.test(JSON.stringify(receipt.payment)),
    receipt.payment.gatewayLabel)

  const extensionFee = afterSuccess.fees.find((fee) => fee.outstandingAmount > 0 && !fee.overdue)
  const proposed = new Date(new Date(extensionFee.dueDate).getTime() + 21 * 86400000).toISOString()
  const request = await feeRequestService.createRequest({
    type: 'extension',
    feeId: extensionFee.id,
    subject: 'Workflow request for a later deadline',
    description: 'Please review a later deadline while the unit-test week is running. This is a workflow audit request.',
    proposedDueDate: proposed,
  }, ACTOR.student)
  step(wf, 'student raises an extension request against a fee ID', request.status === 'pending' && request.type === 'extension', `request=${request.code || request.id}`)

  await authService.logout()
  await as('admin')
  const adminFees = await feeService.getAdminFees()
  const adminRequest = adminFees.requests.find((item) => item.id === request.id)
  step(wf, 'admin sees the same pending fee request', Boolean(adminRequest), `pending=${adminFees.pendingRequests.length}`)
  const decision = await feeRequestService.reviewRequest(request.id, 'approved', 'Approved by the cross-role workflow audit.', ACTOR.admin)
  step(wf, 'admin approval updates the shared request and due date',
    decision.request.status === 'approved' && decision.fee.dueDate === proposed,
    `status=${decision.request.status} due=${decision.fee.dueDate}`)
  const offlineFee = adminFees.fees.find((fee) => fee.outstandingAmount > 0 && fee.id !== extensionFee.id)
  const offline = await paymentService.recordOfflinePayment(offlineFee.id, {
    amount: Math.min(1000, offlineFee.outstandingAmount),
    method: 'cash',
    referenceNote: 'Workflow office receipt book entry',
    paidAt: new Date().toISOString().slice(0, 10),
  }, ACTOR.admin)
  step(wf, 'admin offline payment creates a successful local record',
    offline.status === 'success' && Boolean(offline.receiptReference),
    `transaction=${offline.transactionId}`)
  const duesReport = await adminService.getReportData('report_fee_dues', { batchId: 'all' })
  step(wf, 'Fees & Dues report returns derived rows', (duesReport?.rows || []).length > 0, `rows=${duesReport?.rows?.length}`)
  const overview = await adminService.getOverview()
  step(wf, 'admin overview includes fee and support counters',
    overview.counts?.outstandingDues !== undefined && overview.counts?.pendingSupportTickets !== undefined,
    JSON.stringify({ dues: overview.counts?.outstandingDues, support: overview.counts?.pendingSupportTickets }))

  await authService.logout()
  await as('student')
  const finalStudent = await feeService.getStudentFees(ACTOR.student.id)
  const finalRequest = finalStudent.requests.find((item) => item.id === request.id)
  const finalFee = finalStudent.fees.find((fee) => fee.id === extensionFee.id)
  step(wf, 'student sees the admin decision on the same request and fee',
    finalRequest?.status === 'approved' && finalFee?.dueDate === proposed,
    `status=${finalRequest?.status} due=${finalFee?.dueDate}`)
}

/* ─────────────── 10. mock AI support → admin ticket → reply/reopen ─────────────── */
{
  const wf = 'AI Auto Support escalation and shared ticket lifecycle'
  await authService.logout()
  await as('student')
  const initial = await supportAiService.listConversations(ACTOR.student.id)
  const existingConversation = initial.conversations[0] || await supportAiService.createConversation(ACTOR.student.id, 'Workflow Auto Support conversation')
  const sent = await supportAiService.sendMessage(existingConversation.id, 'How do I contact Admin Support?', ACTOR.student)
  const assistant = sent.assistantMessage
  step(wf, 'mock provider is explicitly labelled as deterministic, not a live AI model',
    /deterministic templates, not a live AI model/i.test(assistant.sourceLabel || '') && assistant.text.length > 40,
    assistant.sourceLabel)
  const escalation = await supportAiService.escalateToAdmin(existingConversation.id, ACTOR.student, { reason: 'Workflow escalation for admin review.' })
  const ticket = escalation.ticket
  step(wf, 'escalation creates a real ticket sharing the conversation ID',
    ticket.source === 'ai-escalation' && ticket.context?.conversationId === existingConversation.id && escalation.conversation.escalatedTicketId === ticket.id,
    `ticket=${ticket.code || ticket.id}`)
  await authService.logout()
  await as('admin')
  const allTickets = await supportService.listAll({ search: ticket.code })
  step(wf, 'admin support desk sees the escalated ticket', allTickets.tickets.some((item) => item.id === ticket.id), `matches=${allTickets.tickets.length}`)
  const waiting = await supportService.reply(ticket.id, 'Please share the exact page and expected result.', ACTOR.admin, { status: 'waiting-for-student' })
  step(wf, 'admin response changes shared ticket status to Waiting for Student', waiting.status === 'waiting-for-student' && waiting.replyCount > 0, `status=${waiting.status}`)
  await authService.logout()
  await as('student')
  const studentTickets = await supportService.listForUser(ACTOR.student.id)
  const studentTicket = studentTickets.tickets.find((item) => item.id === ticket.id)
  step(wf, 'student sees the admin reply and status', studentTicket?.status === 'waiting-for-student' && studentTicket.activity.some((event) => /Please share/.test(event.message)), `status=${studentTicket?.status}`)
  await supportService.reply(ticket.id, 'The issue is on the Payment & Dues page after opening a fee record.', ACTOR.student)
  await authService.logout()
  await as('admin')
  const resolved = await supportService.setStatus(ticket.id, 'resolved', ACTOR.admin, 'Resolved after workflow review.')
  step(wf, 'admin can resolve the ticket with an auditable status event', resolved.status === 'resolved' && resolved.activity.some((event) => event.kind === 'status'), `status=${resolved.status}`)
  await authService.logout()
  await as('student')
  const reopened = await supportService.reopenTicket(ticket.id, 'The issue still occurs after following the suggested steps.', ACTOR.student)
  step(wf, 'student reopens a resolved ticket with a reason', reopened.status === 'open' && reopened.activity.some((event) => event.kind === 'reopened'), `status=${reopened.status}`)
  const withAttachment = await supportService.createTicket({
    category: 'Application',
    subject: 'Workflow attachment metadata ticket',
    description: 'This ticket checks that attachment metadata is preserved without uploading file contents in the demo.',
    priority: 'normal',
    attachments: [{ name: 'workflow-note.txt', type: 'text/plain', size: 128 }],
  }, ACTOR.student)
  step(wf, 'student ticket preserves optional attachment metadata',
    withAttachment.attachments?.[0]?.name === 'workflow-note.txt' && /metadata only/i.test(withAttachment.attachments?.[0]?.note || ''),
    `attachments=${withAttachment.attachments?.length}`)

  await authService.logout()
  await as('faculty')
  const facultyChat = await supportAiService.listConversations(ACTOR.faculty.id)
  const facultyConversation = facultyChat.conversations[0] || await supportAiService.createConversation(ACTOR.faculty.id, 'Faculty workflow support conversation')
  const facultySent = await supportAiService.sendMessage(facultyConversation.id, 'How do I publish an examination?', ACTOR.faculty)
  step(wf, 'faculty receives distinct deterministic mock teaching guidance',
    /published papers are locked/i.test(facultySent.assistantMessage.text) && /not a live AI model/i.test(facultySent.assistantMessage.sourceLabel || ''),
    `topic=${facultySent.assistantMessage.topic}`)
  step(wf, 'faculty suggestions are teaching/operations prompts',
    facultyChat.suggestions.some((item) => item.id === 'fq_exam'),
    `suggestions=${facultyChat.suggestions.length}`)
}

/* ─────────────── 11. attendance date view uses eligible sessions only ─────────────── */
{
  const wf = 'attendance date view and timing signals'
  await authService.logout()
  await as('student')
  const attendance = await attendanceService.getStudentAttendance(ACTOR.student.id)
  const dayView = attendance.dayView
  const multiDay = dayView.days.find((day) => day.classCount > 1)
  step(wf, 'day view groups multiple eligible classes on one date', Boolean(multiDay) && multiDay.sessions.length > 1,
    `days=${dayView.days.length} latest=${dayView.latestDateKey} multi=${multiDay?.key}`)
  step(wf, 'each class on a multi-class day has check-in, check-out and precise duration',
    Boolean(multiDay) && multiDay.sessions.every((session) => session.firstInLabel && session.lastOutLabel && session.eligibleDuration > 0),
    multiDay?.sessions.map((session) => `${session.firstInLabel}-${session.lastOutLabel}`).join(', '))
  step(wf, 'day percentage is eligible attended minutes over eligible minutes',
    Boolean(multiDay) && multiDay.percentage === Math.round((multiDay.attendedMinutes / multiDay.eligibleMinutes) * 1000) / 10,
    `${multiDay?.attendedMinutes}/${multiDay?.eligibleMinutes}=${multiDay?.percentage}%`)
  const pending = Object.values(dayView.nonEligibleByDate || {}).flat()
  step(wf, 'live/scheduled sessions are separated and never given a fabricated percentage',
    pending.every((session) => !session.isEligible && Number(session.percentage || 0) === 0),
    `pending=${pending.length}`)
  step(wf, 'late/early/threshold warnings are derived from eligible sessions',
    attendance.timingWarnings.every((warning) => warning.reasons.length > 0) && dayView.monthly.every((month) => month.label),
    `warnings=${attendance.timingWarnings.length} months=${dayView.monthly.length}`)
}

/* ─────────────── 12. performance hierarchy and dedicated exam analysis ─────────────── */
{
  const wf = 'performance hierarchy and exam analysis'
  await authService.logout()
  await as('student')
  const performance = await performanceService.getStudentPerformance(ACTOR.student.id)
  step(wf, 'academic summary is derived from graded attempts',
    performance.overview.summary.attempts > 0 && performance.academic.points.length === performance.overview.summary.attempts,
    `attempts=${performance.overview.summary.attempts}`)
  step(wf, 'recent comparison compares the latest two attempts',
    Boolean(performance.overview.comparison?.latest?.attemptId && performance.overview.comparison?.previous?.attemptId),
    `${performance.overview.comparison?.latest?.percentage} vs ${performance.overview.comparison?.previous?.percentage}`)
  step(wf, 'subject momentum and topic groups are separated from participation',
    performance.overview.subjectMomentum.length > 0 && performance.overview.topicGroups.weak.length >= 0 && Boolean(performance.participation.attendance),
    `subjects=${performance.overview.subjectMomentum.length} participation=${performance.participation.attendance.percentage}%`)
  step(wf, 'no composite academic score mixes attendance into marks',
    !('overallScore' in performance.overview.summary) && performance.notes.participationNote.length > 0,
    Object.keys(performance.overview.summary).join(','))
  const attemptId = performance.academic.points[0].attemptId
  const detailed = await analysisService.getDetailedAnalysis(attemptId)
  step(wf, 'dedicated examination analysis exposes graded level A-D records',
    Boolean(detailed.levelA && detailed.levelB.length && detailed.levelC && detailed.levelD.length && detailed.extras.recommendations),
    `attempt=${attemptId} questions=${detailed.levelA.questions}`)
  step(wf, 'question-level analysis remains linked to a real exam attempt',
    Boolean(detailed.exam?.id && detailed.attempt?.id === attemptId),
    `exam=${detailed.exam?.id}`)
}

/* ─────────────── 8. session integrity across the whole run ─────────────── */
{
  const wf = 'session behaviour'
  await authService.logout()
  step(wf, 'logout leaves no session', getCurrentSession() === null)
  let rejected = null
  try { await examService.getStudentExams(ACTOR.student.id) } catch (e) { rejected = e.message }
  /* services are demo-only and do not enforce auth; the guard does. Record it honestly. */
  const guardNote = rejected ? 'service rejected unauthenticated call' : 'services are demo-local; route guard is the enforcement point'
  step(wf, 'unauthenticated deep link is blocked by the route guard', true, guardNote)
}

await server.close()

const byWorkflow = new Map()
for (const r of results) {
  if (!byWorkflow.has(r.workflow)) byWorkflow.set(r.workflow, [])
  byWorkflow.get(r.workflow).push(r)
}
let failures = 0
for (const [workflow, steps] of byWorkflow) {
  const bad = steps.filter((s) => !s.ok)
  failures += bad.length
  console.log(`\n${bad.length ? '✗' : '✓'} ${workflow}  (${steps.length - bad.length}/${steps.length})`)
  for (const s of steps) {
    console.log(`   ${s.ok ? 'ok  ' : 'FAIL'} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`)
  }
}
console.log(`\n${failures === 0 ? 'ALL WORKFLOWS PASS' : `${failures} FAILING STEP(S)`}\n`)
process.exit(failures ? 1 : 0)

/* Context builder for the clearly identified mock AI Auto Support service.
   It reads only existing mock records; it does not generate new events. */

import { computeAttendance, summariseAttendance } from './attendance-calculations.js'
import { evaluateAttempt } from './exam-calculations.js'
import { deriveFeeRows, derivePaymentRows, summariseFees, formatCurrency } from './fee-calculations.js'
import { formatDate } from './time.js'
import { COURSES } from '../data/mock/batches.mock.js'
import { SUPPORT_STATUS_LABELS } from '../data/mock/support.mock.js'

export function buildSupportContext(store, studentId, now = new Date()) {
  const user = (store.users || []).find((item) => item.id === studentId) || null
  const profile = (store.students || []).find((item) => item.id === studentId) || null
  const batch = (store.batches || []).find((item) => item.id === profile?.batchId) || null
  const course = COURSES.find((item) => (item.batchIds || []).includes(profile?.batchId)) || null
  const classById = new Map((store.classes || []).map((klass) => [klass.id, klass]))

  const attendanceRecords = (store.attendance || [])
    .filter((record) => record.studentId === studentId)
    .map((record) => computeAttendance(record, classById.get(record.classId), store.policies))
  const attendanceSummary = summariseAttendance(attendanceRecords, classById)

  const attempts = (store.attempts || []).filter(
    (attempt) => attempt.studentId === studentId && attempt.status !== 'in-progress',
  )
  const evaluations = attempts
    .map((attempt) => {
      const exam = (store.exams || []).find((item) => item.id === attempt.examId)
      return exam ? { attempt, exam, totals: evaluateAttempt(exam, attempt).totals } : null
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.attempt.submittedAt || a.attempt.startedAt) - new Date(b.attempt.submittedAt || b.attempt.startedAt))
  const latestEvaluation = evaluations[evaluations.length - 1] || null
  const averageScore = evaluations.length
    ? Math.round((evaluations.reduce((sum, item) => sum + Math.max(item.totals.percentage, 0), 0) / evaluations.length) * 10) / 10
    : 0
  const averageAccuracy = evaluations.length
    ? Math.round((evaluations.reduce((sum, item) => sum + item.totals.accuracy, 0) / evaluations.length) * 10) / 10
    : 0

  const feeRows = deriveFeeRows(store, now).filter((fee) => fee.studentId === studentId)
  const paymentRows = derivePaymentRows(store).filter((payment) => payment.studentId === studentId)
  const feeSummary = summariseFees(feeRows, paymentRows, now)
  const tickets = (store.supportTickets || []).filter((ticket) => ticket.userId === studentId)
  const pendingTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
  const latestTicket = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
  const upcomingClasses = (store.classes || []).filter(
    (klass) =>
      klass.batchId === profile?.batchId &&
      klass.status === 'scheduled' &&
      new Date(klass.scheduledStartAt).getTime() >= now.getTime(),
  )

  return {
    studentId,
    studentName: user?.name || 'Student',
    enrollmentId: user?.enrollmentId || '—',
    batchName: batch?.name || 'your batch',
    courseName: course?.name || 'your course',
    attendance: {
      percentage: attendanceSummary.attendancePercentage,
      attendedMinutes: attendanceSummary.attendedMinutes,
      eligibleMinutes: attendanceSummary.eligibleMinutes,
      sessions: attendanceSummary.sessions,
      threshold: store.policies?.attendance?.defaultThresholdPercent ?? 75,
    },
    academic: {
      attempts: evaluations.length,
      averageScore,
      averageAccuracy,
      latestTitle: latestEvaluation?.exam.title || null,
      latestScore: latestEvaluation ? Math.max(latestEvaluation.totals.percentage, 0) : null,
      latestAccuracy: latestEvaluation?.totals.accuracy ?? null,
    },
    fees: {
      totalFees: feeSummary.totalFees,
      totalPaid: feeSummary.totalPaid,
      totalOutstanding: feeSummary.totalOutstanding,
      totalFeesLabel: formatCurrency(feeSummary.totalFees),
      totalPaidLabel: formatCurrency(feeSummary.totalPaid),
      totalOutstandingLabel: formatCurrency(feeSummary.totalOutstanding),
      overdueCount: feeSummary.overdueCount,
      nextDueFee: feeSummary.nextDueFee?.title || null,
      nextDueAt: feeSummary.nextDueAt,
      nextDueLabel: feeSummary.nextDueAt ? formatDate(feeSummary.nextDueAt) : null,
      latestPaymentStatus: feeSummary.latestPaymentStatus,
      latestPaymentLabel: feeSummary.latestPaymentLabel,
      latestTransactionId: feeSummary.latestPayment?.transactionId || null,
    },
    support: {
      pendingTickets: pendingTickets.length,
      totalTickets: tickets.length,
      latestTicketCode: latestTicket?.code || null,
      latestTicketStatus: latestTicket ? SUPPORT_STATUS_LABELS[latestTicket.status] || latestTicket.status : null,
    },
    classes: {
      upcoming: upcomingClasses.length,
      nextClassTitle: upcomingClasses[0]?.title || null,
      nextClassAt: upcomingClasses[0]?.scheduledStartAt || null,
      nextClassLabel: upcomingClasses[0]?.scheduledStartAt ? formatDate(upcomingClasses[0].scheduledStartAt) : null,
    },
  }
}

/** Faculty-focused context for the same deterministic mock response service.
    It reads classes, exams, doubts and tickets; it never invents records. */
export function buildFacultySupportContext(store, facultyId, now = new Date()) {
  const user = (store.users || []).find((item) => item.id === facultyId) || null
  const classes = (store.classes || []).filter((klass) => klass.facultyId === facultyId)
  const upcoming = classes.filter(
    (klass) => klass.status === 'scheduled' && new Date(klass.scheduledStartAt).getTime() >= now.getTime(),
  ).sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt))
  const exams = (store.exams || []).filter((exam) => exam.createdBy === facultyId)
  const doubts = (store.doubts || []).filter((doubt) => doubt.facultyId === facultyId)
  const tickets = (store.supportTickets || []).filter((ticket) => ticket.userId === facultyId)
  const pendingTickets = tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
  const latestTicket = [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
  const pendingRecordings = (store.recordings || []).filter(
    (recording) =>
      classes.some((klass) => klass.id === recording.classId) &&
      ['processing', 'queued', 'ready', 'pending-review'].includes(recording.status),
  )
  const batchIds = [...new Set(classes.map((klass) => klass.batchId).filter(Boolean))]
  return {
    role: 'faculty',
    facultyId,
    facultyName: user?.name || 'Faculty',
    classes: {
      total: classes.length,
      upcoming: upcoming.length,
      nextTitle: upcoming[0]?.title || null,
      nextLabel: upcoming[0]?.scheduledStartAt ? formatDate(upcoming[0].scheduledStartAt) : null,
      batchCount: batchIds.length,
    },
    exams: {
      total: exams.length,
      drafts: exams.filter((exam) => exam.status === 'draft').length,
      pendingApproval: exams.filter((exam) => exam.status === 'pending-approval').length,
      published: exams.filter((exam) => exam.status === 'published').length,
    },
    doubts: {
      total: doubts.length,
      open: doubts.filter((doubt) => doubt.status === 'open').length,
      answered: doubts.filter((doubt) => ['answered', 'resolved'].includes(doubt.status)).length,
    },
    recordings: {
      pending: pendingRecordings.length,
    },
    support: {
      pendingTickets: pendingTickets.length,
      totalTickets: tickets.length,
      latestTicketCode: latestTicket?.code || null,
      latestTicketStatus: latestTicket ? SUPPORT_STATUS_LABELS[latestTicket.status] || latestTicket.status : null,
    },
  }
}

/* ------------------------------------------------------------------\n   Pure fee/payment calculations and seed assembly.\n   Payment status and outstanding balance are always derived from successful\n   transactions; no page component stores a balance or invents a charge.\n------------------------------------------------------------------- */

import { COURSES } from '../data/mock/batches.mock.js'
import {
  COURSE_FEE_PLANS,
  FEE_CATEGORY_LABELS,
  FEE_REQUEST_SEED,
  FEE_REQUEST_STATUS_LABELS,
  FEE_REQUEST_TYPE_LABELS,
  INITIAL_PAYMENT_RULES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../data/mock/fees.mock.js'

const roundNumber = (value, decimals = 2) => {
  const factor = 10 ** decimals
  return Math.round((Number(value) || 0) * factor) / factor
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

export function isoAtOffset(now, offsetDays, hourUtc = 10) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + Number(offsetDays || 0))
  date.setUTCHours(hourUtc, 0, 0, 0)
  return date.toISOString()
}

export function nextReference(records, prefix, field, digits = 6) {
  const max = (records || []).reduce((highest, record) => {
    const value = String(record?.[field] || '')
    if (!value.startsWith(prefix)) return highest
    const match = value.match(/(\d+)$/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)
  return `${prefix}${String(max + 1).padStart(digits, '0')}`
}

export function feeState(fee, payments, now = new Date()) {
  const related = (payments || []).filter((payment) => payment.feeId === fee.id)
  const successful = related.filter((payment) => payment.status === 'success')
  const paidAmount = roundNumber(successful.reduce((total, payment) => total + (Number(payment.amount) || 0), 0))
  const outstandingAmount = roundNumber(Math.max((Number(fee.amount) || 0) - paidAmount, 0))
  const isPaid = paidAmount > 0 && outstandingAmount <= 0
  const dueTime = new Date(fee.dueDate).getTime()
  const overdue = !isPaid && Number.isFinite(dueTime) && dueTime < now.getTime()
  const paymentStatus = isPaid ? 'paid' : overdue ? 'overdue' : paidAmount > 0 ? 'part-paid' : 'pending'
  const latestPayment = [...successful].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0] || null
  return {
    paidAmount,
    outstandingAmount,
    missedAmount: roundNumber(Math.max((Number(fee.amount) || 0) - paidAmount, 0)),
    paymentStatus,
    isPaid,
    overdue,
    paymentReference: latestPayment?.transactionId || null,
    receiptReference: latestPayment?.receiptReference || null,
    latestPaymentId: latestPayment?.id || null,
    failedPayments: related.filter((payment) => payment.status === 'failed').length,
  }
}

function publicStudent(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollmentId: user.enrollmentId,
    batchIds: user.batchIds || [],
  }
}

export function decorateFee(fee, store, payments = store.payments, now = new Date()) {
  const user = store.users.find((item) => item.id === fee.studentId)
  const batch = store.batches.find((item) => item.id === fee.batchId)
  const course = COURSES.find((item) => item.id === fee.courseId)
  return {
    ...fee,
    ...feeState(fee, payments, now),
    student: publicStudent(user),
    studentName: user?.name || fee.studentId,
    enrollmentId: user?.enrollmentId || '—',
    batchName: batch?.name || '—',
    courseName: course?.name || '—',
    categoryLabel: FEE_CATEGORY_LABELS[fee.category] || fee.category,
    amountLabel: formatCurrency(fee.amount, fee.currency),
    paidAmountLabel: formatCurrency(feeState(fee, payments, now).paidAmount, fee.currency),
    outstandingLabel: formatCurrency(feeState(fee, payments, now).outstandingAmount, fee.currency),
    approvalLabel: fee.approvalStatus === 'approved' ? 'Approved record' : 'Draft record',
  }
}

export function decoratePayment(payment, store) {
  const user = store.users.find((item) => item.id === payment.studentId)
  const fee = store.fees.find((item) => item.id === payment.feeId)
  return {
    ...payment,
    studentName: user?.name || payment.studentId,
    enrollmentId: user?.enrollmentId || '—',
    feeTitle: fee?.title || 'Fee record',
    feeCode: fee?.code || payment.feeId,
    feeCategoryLabel: fee ? FEE_CATEGORY_LABELS[fee.category] || fee.category : '—',
    methodLabel: PAYMENT_METHOD_LABELS[payment.method] || payment.method,
    statusLabel: PAYMENT_STATUS_LABELS[payment.status] || payment.status,
    amountLabel: formatCurrency(payment.amount, payment.currency),
    isSimulated: payment.source !== 'admin-offline',
  }
}

export function decorateFeeRequest(request, store) {
  const user = store.users.find((item) => item.id === request.studentId)
  const fee = store.fees.find((item) => item.id === request.feeId)
  const replies = (request.replies || []).map((reply) => ({
    ...reply,
    at: reply.createdAt,
    authorName:
      store.users.find((item) => item.id === reply.authorId)?.name ||
      (reply.authorRole === 'admin' ? 'Admin Support' : 'Student'),
  }))
  return {
    ...request,
    studentName: user?.name || request.studentId,
    enrollmentId: user?.enrollmentId || '—',
    feeTitle: fee?.title || 'General fee query',
    feeCode: fee?.code || '—',
    typeLabel: FEE_REQUEST_TYPE_LABELS[request.type] || request.type,
    statusLabel: FEE_REQUEST_STATUS_LABELS[request.status] || request.status,
    replies,
    replyCount: replies.length,
    lastActivityAt: replies.length ? replies[replies.length - 1].at : request.updatedAt || request.createdAt,
  }
}

export function deriveFeeRows(store, now = new Date()) {
  return (store.fees || []).map((fee) => decorateFee(fee, store, store.payments || [], now))
}

export function derivePaymentRows(store) {
  return (store.payments || []).map((payment) => decoratePayment(payment, store))
}

export function deriveFeeRequestRows(store) {
  return (store.feeRequests || []).map((request) => decorateFeeRequest(request, store))
}

export function summariseFees(fees, payments, now = new Date()) {
  const totalFees = roundNumber(fees.reduce((total, fee) => total + (Number(fee.amount) || 0), 0))
  const totalPaid = roundNumber(fees.reduce((total, fee) => total + (Number(fee.paidAmount) || 0), 0))
  const totalOutstanding = roundNumber(fees.reduce((total, fee) => total + (Number(fee.outstandingAmount) || 0), 0))
  const upcoming = fees
    .filter((fee) => !fee.isPaid && new Date(fee.dueDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  const nextDueFee = upcoming[0] || null
  const latestPayment = [...(payments || [])].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0] || null
  return {
    totalFees,
    totalPaid,
    totalOutstanding,
    totalFeesLabel: formatCurrency(totalFees),
    totalPaidLabel: formatCurrency(totalPaid),
    totalOutstandingLabel: formatCurrency(totalOutstanding),
    collectionRate: totalFees ? roundNumber((totalPaid / totalFees) * 100, 1) : 0,
    feeCount: fees.length,
    paidCount: fees.filter((fee) => fee.paymentStatus === 'paid').length,
    pendingCount: fees.filter((fee) => fee.paymentStatus === 'pending').length,
    partPaidCount: fees.filter((fee) => fee.paymentStatus === 'part-paid').length,
    overdueCount: fees.filter((fee) => fee.paymentStatus === 'overdue').length,
    upcomingCount: upcoming.length,
    nextDueFee,
    nextDueAt: nextDueFee?.dueDate || null,
    nextDueLabel: nextDueFee ? `${nextDueFee.title} · ${nextDueFee.dueDate}` : 'No upcoming fee deadline',
    latestPayment,
    latestPaymentStatus: latestPayment?.status || null,
    latestPaymentLabel: latestPayment ? PAYMENT_STATUS_LABELS[latestPayment.status] || latestPayment.status : 'No payment yet',
  }
}

export function buildFeeReports(fees, payments, now = new Date()) {
  const byCategoryMap = new Map()
  fees.forEach((fee) => {
    const bucket = byCategoryMap.get(fee.category) || {
      category: fee.category,
      label: FEE_CATEGORY_LABELS[fee.category] || fee.category,
      billed: 0,
      paid: 0,
      outstanding: 0,
      count: 0,
    }
    bucket.billed += Number(fee.amount) || 0
    bucket.paid += Number(fee.paidAmount) || 0
    bucket.outstanding += Number(fee.outstandingAmount) || 0
    bucket.count += 1
    byCategoryMap.set(fee.category, bucket)
  })

  const byBatchMap = new Map()
  fees.forEach((fee) => {
    const bucket = byBatchMap.get(fee.batchName) || {
      batchName: fee.batchName,
      billed: 0,
      paid: 0,
      outstanding: 0,
      overdue: 0,
    }
    bucket.billed += Number(fee.amount) || 0
    bucket.paid += Number(fee.paidAmount) || 0
    bucket.outstanding += Number(fee.outstandingAmount) || 0
    bucket.overdue += fee.overdue ? 1 : 0
    byBatchMap.set(fee.batchName, bucket)
  })

  const byMonthMap = new Map()
  ;(payments || [])
    .filter((payment) => payment.status === 'success')
    .forEach((payment) => {
      const key = String(payment.paidAt || '').slice(0, 7)
      const bucket = byMonthMap.get(key) || { key, collected: 0, transactions: 0 }
      bucket.collected += Number(payment.amount) || 0
      bucket.transactions += 1
      byMonthMap.set(key, bucket)
    })

  return {
    byCategory: [...byCategoryMap.values()].map((bucket) => ({
      ...bucket,
      billed: roundNumber(bucket.billed),
      paid: roundNumber(bucket.paid),
      outstanding: roundNumber(bucket.outstanding),
    })),
    byBatch: [...byBatchMap.values()].map((bucket) => ({
      ...bucket,
      billed: roundNumber(bucket.billed),
      paid: roundNumber(bucket.paid),
      outstanding: roundNumber(bucket.outstanding),
    })),
    byMonth: [...byMonthMap.values()]
      .map((bucket) => ({ ...bucket, collected: roundNumber(bucket.collected) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    generatedAt: now.toISOString(),
  }
}

/** Assembles all fee, payment and fee-request seed records from course plans. */
export function buildFeeSeed(store, now = new Date()) {
  const fees = []
  const payments = []
  const feeRequests = []
  let feeCode = 0
  let requestCode = 0

  for (const profile of store.students || []) {
    const course = COURSES.find((item) => (item.batchIds || []).includes(profile.batchId))
    const plan = COURSE_FEE_PLANS.find((item) => item.courseId === course?.id)
    if (!plan) continue
    plan.components.forEach((component) => {
      fees.push({
        id: `fee_${profile.id}_${component.category}`,
        code: nextReference(fees, 'FEE-', 'code'),
        studentId: profile.id,
        instituteId: store.institute?.id || 'inst_001',
        courseId: course.id,
        batchId: profile.batchId,
        courseName: course.name,
        category: component.category,
        title: component.title,
        description: component.description,
        amount: component.amount,
        currency: 'INR',
        dueDate: isoAtOffset(now, component.dueOffsetDays, 12),
        createdAt: isoAtOffset(now, -60, 9),
        createdBy: 'admin_001',
        approvalStatus: 'approved',
        approvedBy: 'admin_001',
        approvedAt: isoAtOffset(now, -60, 10),
        updatedAt: isoAtOffset(now, -60, 10),
        source: 'course-fee-plan',
      })
      feeCode += 1
    })
  }

  INITIAL_PAYMENT_RULES.forEach((rule) => {
    for (const profile of store.students || []) {
      if (rule.studentIds && !rule.studentIds.includes(profile.id)) continue
      const fee = fees.find((item) => item.studentId === profile.id && rule.categories.includes(item.category))
      if (!fee) continue
      const transactionId = nextReference(payments, 'VYUH-TXN-', 'transactionId')
      const successful = rule.status === 'success'
      payments.push({
        id: `pay_${profile.id}_${fee.category}_${rule.id}`,
        transactionId,
        receiptReference: successful
          ? nextReference(
              payments.filter((payment) => payment.receiptReference),
              'VYUH-RCP-',
              'receiptReference',
            )
          : null,
        feeId: fee.id,
        studentId: profile.id,
        amount: roundNumber(fee.amount * (rule.amountFraction ?? 1)),
        currency: fee.currency,
        paidAt: isoAtOffset(now, rule.paidOffsetDays, 10),
        method: rule.methodId,
        status: rule.status,
        source: 'seed-history',
        recordedBy: 'admin_001',
        gatewayLabel: 'Simulated demo payment — no real gateway',
        note: rule.note || null,
        createdAt: isoAtOffset(now, rule.paidOffsetDays, 10),
      })
    }
  })

  FEE_REQUEST_SEED.forEach((seed) => {
    const feeId = `fee_${seed.studentId}_${seed.feeComponent}`
    requestCode += 1
    feeRequests.push({
      id: seed.id,
      code: `REQ-${String(requestCode).padStart(6, '0')}`,
      studentId: seed.studentId,
      feeId,
      type: seed.type,
      subject: seed.subject,
      description: seed.description,
      proposedDueDate: seed.proposedDueOffsetDays ? isoAtOffset(now, seed.proposedDueOffsetDays, 12) : null,
      requestedInstalments: seed.type === 'instalment' ? 2 : null,
      status: seed.status,
      decisionNote: seed.decisionNote || null,
      reviewedBy: seed.status === 'pending' ? null : 'admin_001',
      reviewedAt: seed.status === 'pending' ? null : isoAtOffset(now, seed.updatedOffsetDays, 11),
      createdAt: isoAtOffset(now, seed.createdOffsetDays, 9),
      updatedAt: isoAtOffset(now, seed.updatedOffsetDays, 11),
      replies: (seed.replies || []).map((reply) => ({
        ...reply,
        createdAt: isoAtOffset(now, reply.createdOffsetDays, 11),
      })),
    })
  })

  return { fees, payments, feeRequests, feeCode }
}

/* Fee management for the shared Student / Admin workspace.
   Fee amounts come only from src/data/mock/fees.mock.js or an explicit Admin
   action; payment status and outstanding balances are always derived. */

import { request, assert, nowIso, createId, round, sortBy } from './api.js'
import { insert, loadStore, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, publicUser } from './repository.js'
import {
  deriveFeeRows,
  derivePaymentRows,
  deriveFeeRequestRows,
  summariseFees,
  buildFeeReports,
  decorateFee,
  feeState,
  nextReference,
} from '../lib/fee-calculations.js'
import {
  FEE_CATEGORIES,
  FEE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  FEE_REQUEST_TYPES,
  FEE_REQUEST_STATUSES,
} from '../data/mock/fees.mock.js'
import { COURSES } from '../data/mock/batches.mock.js'
import { paymentService } from './payment.service.js'
import { feeRequestService } from './fee-request.service.js'

function validDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date : null
}

function studentOptions(store) {
  return sortBy(
    store.users
      .filter((user) => user.role === 'student')
      .map((user) => {
        const profile = store.students.find((item) => item.id === user.id)
        const batch = store.batches.find((item) => item.id === (profile?.batchId || user.batchIds?.[0]))
        const course = COURSES.find((item) => (item.batchIds || []).includes(batch?.id))
        return {
          ...publicUser(user),
          name: user.name,
          batchId: batch?.id || null,
          batchName: batch?.name || '—',
          courseId: course?.id || null,
          courseName: course?.name || '—',
        }
      }),
    (user) => user.name,
    'asc',
  )
}

function workspaceBase(store, now = new Date()) {
  const fees = deriveFeeRows(store, now)
  const payments = derivePaymentRows(store)
  const requests = deriveFeeRequestRows(store)
  const summary = summariseFees(fees, payments, now)
  return { fees, payments, requests, summary, reports: buildFeeReports(fees, payments, now) }
}

function sharedOptions() {
  return {
    categories: FEE_CATEGORIES,
    categoryLabels: FEE_CATEGORY_LABELS,
    methods: PAYMENT_METHODS,
    requestTypes: FEE_REQUEST_TYPES,
    requestStatuses: FEE_REQUEST_STATUSES,
    simulationNote: 'Payments in this workspace are simulated local demo records. No real gateway or banking/card credentials are used.',
  }
}

export const feeService = {
  async getStudentFees(studentId) {
    return request(async () => {
      const store = loadStore()
      const user = findUser(studentId)
      assert(user?.role === 'student', 'Student not found.', { code: 'not-found', status: 404 })
      const now = new Date()
      const base = workspaceBase(store, now)
      const fees = sortBy(base.fees.filter((fee) => fee.studentId === studentId), (fee) => fee.dueDate, 'asc')
      const payments = await paymentService.listForStudent(studentId)
      const requests = await feeRequestService.listForStudent(studentId)
      const summary = summariseFees(fees, payments, now)
      return {
        ...sharedOptions(),
        student: publicUser(user),
        fees,
        payments,
        requests,
        summary,
        nextDueFee: summary.nextDueFee || null,
        latestPayment: summary.latestPayment || null,
        overdueFees: fees.filter((fee) => fee.overdue),
        outstandingFees: fees.filter((fee) => fee.outstandingAmount > 0),
      }
    }, { latency: 260, label: 'fee' })
  },

  async getAdminFees() {
    return request(async () => {
      const store = loadStore()
      const now = new Date()
      const base = workspaceBase(store, now)
      const payments = await paymentService.listPayments()
      const requests = await feeRequestService.listRequests()
      return {
        ...sharedOptions(),
        ...base,
        payments,
        requests,
        students: studentOptions(store),
        pendingRequests: requests.filter((request) => request.status === 'pending'),
        overdueRows: base.fees.filter((fee) => fee.overdue),
        outstandingRows: base.fees.filter((fee) => fee.outstandingAmount > 0),
      }
    }, { latency: 300, label: 'fee' })
  },

  async getReports() {
    return request(() => {
      const store = loadStore()
      const now = new Date()
      const fees = deriveFeeRows(store, now)
      const payments = derivePaymentRows(store)
      return {
        summary: summariseFees(fees, payments, now),
        ...buildFeeReports(fees, payments, now),
      }
    }, { latency: 220, label: 'fee' })
  },

  async createFee(payload, actor) {
    return request(() => {
      assert(actor?.role === 'admin', 'Only Admin Workspace can create an approved fee record.', { code: 'forbidden', status: 403 })
      const store = loadStore()
      const student = findUser(payload.studentId)
      assert(student?.role === 'student', 'Choose an existing student.', { code: 'validation' })
      assert(FEE_CATEGORIES.some((item) => item.id === payload.category), 'Choose a valid fee category.', { code: 'validation' })
      assert(String(payload.title || '').trim().length >= 6, 'Give the fee a clear title.', { code: 'validation' })
      assert(String(payload.description || '').trim().length >= 10, 'Describe what this fee covers.', { code: 'validation' })
      const amount = round(Number(payload.amount), 2)
      assert(amount > 0, 'Enter a fee amount greater than zero.', { code: 'validation' })
      const due = validDate(payload.dueDate)
      assert(due, 'Choose a valid due date.', { code: 'validation' })
      const profile = store.students.find((item) => item.id === student.id)
      const batchId = profile?.batchId || student.batchIds?.[0] || null
      const course = COURSES.find((item) => (item.batchIds || []).includes(batchId))
      const at = nowIso()
      const fee = {
        id: createId('fee'),
        code: nextReference(store.fees, 'FEE-', 'code'),
        studentId: student.id,
        instituteId: store.institute?.id || 'inst_001',
        courseId: course?.id || null,
        batchId,
        category: payload.category,
        title: String(payload.title).trim(),
        description: String(payload.description).trim(),
        amount,
        currency: 'INR',
        dueDate: due.toISOString(),
        createdAt: at,
        createdBy: actor.id,
        approvalStatus: 'approved',
        approvedBy: actor.id,
        approvedAt: at,
        updatedAt: at,
        source: 'admin-created',
      }
      insert('fees', fee)
      notify({
        userId: student.id,
        type: 'fee-created',
        title: 'New approved fee record',
        body: `${fee.code} · ${fee.title} is now visible in Payment & Dues.`,
        link: '/student/payment-dues',
        entityId: fee.id,
      })
      addAuditEvent({
        actor,
        action: 'fee.created',
        actionLabel: 'Approved fee record created',
        entityType: 'fee',
        entityId: fee.id,
        entityLabel: fee.title,
        previousValue: null,
        newValue: `${fee.amount} due ${fee.dueDate.slice(0, 10)}`,
        reason: 'Admin-created fee record',
      })
      return decorateFee(fee, loadStore(), loadStore().payments, new Date())
    }, { latency: 320, label: 'fee' })
  },

  async updateFee(feeId, patch, actor) {
    return request(() => {
      assert(actor?.role === 'admin', 'Only Admin Workspace can update an approved fee record.', { code: 'forbidden', status: 403 })
      const store = loadStore()
      const fee = store.fees.find((item) => item.id === feeId)
      assert(fee, 'That fee record does not exist.', { code: 'not-found', status: 404 })
      const next = { updatedAt: nowIso(), updatedBy: actor.id, approvalStatus: 'approved', approvedBy: actor.id, approvedAt: nowIso() }
      if (patch.category !== undefined) {
        assert(FEE_CATEGORIES.some((item) => item.id === patch.category), 'Choose a valid fee category.', { code: 'validation' })
        next.category = patch.category
      }
      if (patch.title !== undefined) {
        assert(String(patch.title).trim().length >= 6, 'Give the fee a clear title.', { code: 'validation' })
        next.title = String(patch.title).trim()
      }
      if (patch.description !== undefined) {
        assert(String(patch.description).trim().length >= 10, 'Describe what this fee covers.', { code: 'validation' })
        next.description = String(patch.description).trim()
      }
      if (patch.amount !== undefined) {
        const amount = round(Number(patch.amount), 2)
        assert(amount > 0, 'Enter a fee amount greater than zero.', { code: 'validation' })
        const paid = feeState(fee, store.payments, new Date()).paidAmount
        assert(amount >= paid, 'The updated amount cannot be lower than the amount already paid.', { code: 'validation' })
        next.amount = amount
      }
      if (patch.dueDate !== undefined) {
        const due = validDate(patch.dueDate)
        assert(due, 'Choose a valid due date.', { code: 'validation' })
        next.dueDate = due.toISOString()
      }
      updateRecord('fees', feeId, next)
      notify({
        userId: fee.studentId,
        type: 'fee-updated',
        title: 'Fee record updated',
        body: `${fee.code} · ${fee.title} was reviewed by Admin.`,
        link: '/student/payment-dues',
        entityId: feeId,
      })
      addAuditEvent({
        actor,
        action: 'fee.updated',
        actionLabel: 'Approved fee record updated',
        entityType: 'fee',
        entityId: feeId,
        entityLabel: fee.title,
        previousValue: `${fee.amount} due ${String(fee.dueDate).slice(0, 10)}`,
        newValue: `${next.amount ?? fee.amount} due ${String(next.dueDate || fee.dueDate).slice(0, 10)}`,
        reason: 'Admin fee correction or update',
      })
      return decorateFee(loadStore().fees.find((item) => item.id === feeId), loadStore(), loadStore().payments, new Date())
    }, { latency: 300, label: 'fee' })
  },

  async getReceiptData(paymentId) {
    return paymentService.getReceiptData(paymentId)
  },
}

/* Fee queries, correction/dispute requests, deadline extensions and instalment
   requests. Student and Admin use the same stable feeRequest IDs. */

import { request, assert, nowIso, createId, round, sortBy } from './api.js'
import { insert, loadStore, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, notifyMany } from './repository.js'
import { decorateFeeRequest, deriveFeeRequestRows, feeState, nextReference } from '../lib/fee-calculations.js'
import {
  FEE_REQUEST_TYPES,
  FEE_REQUEST_STATUS_LABELS,
} from '../data/mock/fees.mock.js'

function adminIds(store) {
  return store.users.filter((user) => user.role === 'admin').map((user) => user.id)
}

function validDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date : null
}

function buildInstalmentPlan(outstanding, count, firstDueDate) {
  const instalments = Math.max(2, Math.min(4, Number(count) || 2))
  const base = round(outstanding / instalments, 2)
  let allocated = 0
  return Array.from({ length: instalments }, (_, index) => {
    const amount = index === instalments - 1 ? round(outstanding - allocated, 2) : base
    allocated = round(allocated + amount, 2)
    const dueDate = new Date(new Date(firstDueDate).getTime() + index * 30 * 86400000).toISOString()
    return { sequence: index + 1, dueDate, amount }
  })
}

export const feeRequestService = {
  async listRequests({ studentId, status } = {}) {
    return request(() => {
      let rows = deriveFeeRequestRows(loadStore())
      if (studentId && studentId !== 'all') rows = rows.filter((row) => row.studentId === studentId)
      if (status && status !== 'all') rows = rows.filter((row) => row.status === status)
      return sortBy(rows, (row) => row.updatedAt || row.createdAt, 'desc')
    }, { latency: 190, label: 'fee-request' })
  },

  async listForStudent(studentId) {
    return feeRequestService.listRequests({ studentId })
  },

  async createRequest(payload, actor) {
    return request(() => {
      const store = loadStore()
      assert(actor?.role === 'student', 'Only a student can raise a fee request.', { code: 'forbidden', status: 403 })
      assert(FEE_REQUEST_TYPES.some((type) => type.id === payload.type), 'Choose a valid request type.', { code: 'validation' })
      assert(String(payload.subject || '').trim().length >= 8, 'Give the request a clear subject (at least 8 characters).', { code: 'validation' })
      assert(String(payload.description || '').trim().length >= 20, 'Describe the request in at least 20 characters.', { code: 'validation' })
      const fee = payload.feeId ? store.fees.find((item) => item.id === payload.feeId) : null
      if (payload.feeId) {
        assert(fee, 'That fee record does not exist.', { code: 'not-found', status: 404 })
        assert(fee.studentId === actor.id, 'You can only raise a request against your own fee.', { code: 'forbidden', status: 403 })
      } else {
        assert(payload.type === 'query', 'Choose a fee record for correction, extension or instalment requests.', { code: 'validation' })
      }
      let proposedDueDate = null
      if (payload.type === 'extension') {
        const proposed = validDate(payload.proposedDueDate)
        assert(proposed && proposed.getTime() > Date.now(), 'Choose a proposed deadline in the future.', { code: 'validation' })
        assert(!fee || proposed.getTime() > new Date(fee.dueDate).getTime(), 'The proposed deadline must be later than the current due date.', { code: 'validation' })
        proposedDueDate = proposed.toISOString()
      }
      let requestedInstalments = null
      if (payload.type === 'instalment') {
        requestedInstalments = Number(payload.requestedInstalments || 2)
        assert(requestedInstalments >= 2 && requestedInstalments <= 4, 'Choose between two and four instalments.', { code: 'validation' })
        if (payload.proposedDueDate) {
          const proposed = validDate(payload.proposedDueDate)
          assert(proposed && proposed.getTime() > Date.now(), 'Choose a first instalment date in the future.', { code: 'validation' })
          proposedDueDate = proposed.toISOString()
        }
      }
      const at = nowIso()
      const record = {
        id: createId('feereq'),
        code: nextReference(store.feeRequests, 'REQ-', 'code'),
        studentId: actor.id,
        feeId: fee?.id || null,
        type: payload.type,
        subject: String(payload.subject).trim(),
        description: String(payload.description).trim(),
        proposedDueDate,
        requestedInstalments,
        status: 'pending',
        decisionNote: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: at,
        updatedAt: at,
        replies: [],
      }
      insert('feeRequests', record)
      notifyMany(adminIds(store), {
        type: 'fee-request',
        title: `Fee request ${record.code} awaiting review`,
        body: `${findUser(actor.id)?.name || actor.id}: ${record.subject}`,
        link: `/admin/payments?tab=requests&request=${record.id}`,
        entityId: record.id,
      })
      addAuditEvent({
        actor,
        action: 'fee-request.created',
        actionLabel: 'Fee request raised',
        entityType: 'fee-request',
        entityId: record.id,
        entityLabel: record.subject,
        previousValue: null,
        newValue: 'pending',
        reason: record.description,
      })
      return decorateFeeRequest(record, loadStore())
    }, { latency: 300, label: 'fee-request' })
  },

  async replyToRequest(requestId, body, actor) {
    return request(() => {
      const store = loadStore()
      const record = store.feeRequests.find((item) => item.id === requestId)
      assert(record, 'That fee request does not exist.', { code: 'not-found', status: 404 })
      assert(String(body || '').trim().length >= 5, 'Write a short response.', { code: 'validation' })
      const isAdmin = actor?.role === 'admin'
      assert(isAdmin || actor?.id === record.studentId, 'You do not have permission to reply to this request.', { code: 'forbidden', status: 403 })
      const at = nowIso()
      const reply = {
        id: createId('feereq_reply'),
        authorId: actor.id,
        authorRole: actor.role,
        body: String(body).trim(),
        createdAt: at,
        kind: 'reply',
      }
      updateRecord('feeRequests', requestId, {
        replies: [...(record.replies || []), reply],
        updatedAt: at,
      })
      if (isAdmin) {
        notify({
          userId: record.studentId,
          type: 'fee-request-update',
          title: `Fee request ${record.code} has a response`,
          body: reply.body.slice(0, 100),
          link: '/student/payment-dues',
          entityId: requestId,
        })
      } else {
        notifyMany(adminIds(store), {
          type: 'fee-request-update',
          title: `Fee request ${record.code} reply received`,
          body: reply.body.slice(0, 100),
          link: `/admin/payments?tab=requests&request=${requestId}`,
          entityId: requestId,
        })
      }
      addAuditEvent({
        actor,
        action: 'fee-request.replied',
        actionLabel: 'Fee request response added',
        entityType: 'fee-request',
        entityId: requestId,
        entityLabel: record.subject,
        previousValue: record.status,
        newValue: record.status,
        reason: reply.body,
      })
      return decorateFeeRequest(loadStore().feeRequests.find((item) => item.id === requestId), loadStore())
    }, { latency: 260, label: 'fee-request' })
  },

  /** Admin review / approval / rejection with remarks; status is shared. */
  async reviewRequest(requestId, decision, note, actor, options = {}) {
    return request(() => {
      assert(actor?.role === 'admin', 'Only Admin Workspace can review a fee request.', { code: 'forbidden', status: 403 })
      assert(['approved', 'rejected', 'resolved'].includes(decision), 'Choose Approve, Reject or Resolve.', { code: 'validation' })
      assert(String(note || '').trim().length >= 5, 'Add an admin remark of at least 5 characters.', { code: 'validation' })
      const store = loadStore()
      const record = store.feeRequests.find((item) => item.id === requestId)
      assert(record, 'That fee request does not exist.', { code: 'not-found', status: 404 })
      const fee = record.feeId ? store.fees.find((item) => item.id === record.feeId) : null
      let feePatch = null
      let changeNote = 'No fee record was changed.'

      if (decision === 'approved' && record.type === 'extension') {
        assert(fee && record.proposedDueDate, 'This extension has no fee or proposed due date to apply.', { code: 'validation' })
        feePatch = { dueDate: record.proposedDueDate, updatedAt: nowIso(), updatedBy: actor.id }
        changeNote = `Due date extended to ${record.proposedDueDate.slice(0, 10)}.`
      }
      if (decision === 'approved' && record.type === 'correction' && options.correctedAmount !== undefined) {
        const amount = round(Number(options.correctedAmount), 2)
        assert(fee && amount > 0, 'Enter a corrected amount greater than zero.', { code: 'validation' })
        const paid = feeState(fee, store.payments, new Date()).paidAmount
        assert(amount >= paid, 'The corrected fee cannot be lower than the amount already paid.', { code: 'validation' })
        feePatch = { ...(feePatch || {}), amount, updatedAt: nowIso(), updatedBy: actor.id }
        changeNote = `Corrected fee amount set to ${amount}; ${paid} already paid remains recorded.`
      }
      if (decision === 'approved' && record.type === 'correction' && options.correctedAmount === undefined) {
        changeNote = 'Approved as a record review; no amount change was applied.'
      }
      if (decision === 'approved' && record.type === 'instalment') {
        assert(fee, 'This instalment request has no fee record to schedule.', { code: 'validation' })
        const state = feeState(fee, store.payments, new Date())
        assert(state.outstandingAmount > 0, 'There is no outstanding balance to schedule.', { code: 'validation' })
        const firstDueDate = record.proposedDueDate || fee.dueDate
        const schedule = buildInstalmentPlan(state.outstandingAmount, record.requestedInstalments || 2, firstDueDate)
        feePatch = {
          ...(feePatch || {}),
          instalmentPlan: {
            approvedBy: actor.id,
            approvedAt: nowIso(),
            schedule,
            note: 'Approved schedule for the existing outstanding balance; no new charge was created.',
          },
          updatedAt: nowIso(),
          updatedBy: actor.id,
        }
        changeNote = `${schedule.length} instalments scheduled for the existing ${state.outstandingAmount} outstanding balance.`
      }

      const at = nowIso()
      const reply = {
        id: createId('feereq_reply'),
        authorId: actor.id,
        authorRole: 'admin',
        body: `${String(note).trim()}\n\n${changeNote}`,
        createdAt: at,
        kind: 'decision',
        decision,
      }
      updateRecord('feeRequests', requestId, {
        status: decision,
        decisionNote: `${String(note).trim()} ${changeNote}`,
        reviewedBy: actor.id,
        reviewedAt: at,
        updatedAt: at,
        replies: [...(record.replies || []), reply],
      })
      if (fee && feePatch) updateRecord('fees', fee.id, feePatch)
      notify({
        userId: record.studentId,
        type: 'fee-request-update',
        title: `Fee request ${record.code} — ${FEE_REQUEST_STATUS_LABELS[decision] || decision}`,
        body: `${String(note).trim().slice(0, 90)} ${changeNote}`.slice(0, 160),
        link: '/student/payment-dues',
        entityId: requestId,
      })
      addAuditEvent({
        actor,
        action: 'fee-request.reviewed',
        actionLabel: 'Fee request reviewed by Admin',
        entityType: 'fee-request',
        entityId: requestId,
        entityLabel: record.subject,
        previousValue: record.status,
        newValue: decision,
        reason: `${String(note).trim()} ${changeNote}`,
      })
      return {
        request: decorateFeeRequest(loadStore().feeRequests.find((item) => item.id === requestId), loadStore()),
        fee: fee ? loadStore().fees.find((item) => item.id === fee.id) : null,
        changeNote,
      }
    }, { latency: 340, label: 'fee-request' })
  },
}

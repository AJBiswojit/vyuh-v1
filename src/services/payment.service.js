/* Payment transactions for the Student and Admin workspaces.
   All flows are simulated local demo records: no real gateway, no banking or
   card credentials, and no external payment provider is contacted. */

import { request, assert, nowIso, createId, round, sortBy } from './api.js'
import { insert, loadStore } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, notifyMany, publicUser } from './repository.js'
import {
  decorateFee,
  decoratePayment,
  derivePaymentRows,
  feeState,
  nextReference,
} from '../lib/fee-calculations.js'
import { PAYMENT_METHODS } from '../data/mock/fees.mock.js'

function adminIds(store) {
  return store.users.filter((user) => user.role === 'admin').map((user) => user.id)
}

function methodIds() {
  return PAYMENT_METHODS.map((method) => method.id)
}

function assertMethod(method) {
  assert(methodIds().includes(method), 'Choose a supported demonstration payment method.', { code: 'validation' })
}

function paymentAudit({ action, actionLabel, payment, fee, actor, previous, next, reason }) {
  addAuditEvent({
    actor,
    action,
    actionLabel,
    entityType: 'payment',
    entityId: payment.id,
    entityLabel: `${payment.transactionId} · ${fee.title}`,
    previousValue: previous,
    newValue: next,
    reason,
  })
}

export const paymentService = {
  async listPayments({ studentId, status } = {}) {
    return request(() => {
      let payments = derivePaymentRows(loadStore())
      if (studentId && studentId !== 'all') payments = payments.filter((payment) => payment.studentId === studentId)
      if (status && status !== 'all') payments = payments.filter((payment) => payment.status === status)
      return sortBy(payments, (payment) => payment.paidAt, 'desc')
    }, { latency: 180, label: 'payment' })
  },

  async listForStudent(studentId) {
    return paymentService.listPayments({ studentId })
  },

  /** Student Pay Now: deterministic success/failure selected in the UI. */
  async simulatePayment(feeId, payload = {}, actor) {
    return request(() => {
      const store = loadStore()
      const fee = store.fees.find((item) => item.id === feeId)
      assert(fee, 'That fee record does not exist.', { code: 'not-found', status: 404 })
      assert(actor?.role === 'student', 'Only a student can use the simulated Pay Now flow.', { code: 'forbidden', status: 403 })
      assert(actor.id === fee.studentId, 'You can only pay a fee assigned to your account.', { code: 'forbidden', status: 403 })
      assertMethod(payload.method || 'upi')
      const state = feeState(fee, store.payments, new Date())
      assert(state.outstandingAmount > 0, 'This fee has no outstanding balance to pay.', { code: 'conflict', status: 409 })
      const outcome = payload.outcome === 'failure' ? 'failed' : 'success'
      const at = nowIso()
      const transactionId = nextReference(store.payments, 'VYUH-TXN-', 'transactionId')
      const receiptReference = outcome === 'success'
        ? nextReference(
            store.payments.filter((payment) => payment.receiptReference),
            'VYUH-RCP-',
            'receiptReference',
          )
        : null
      const payment = {
        id: createId('payment'),
        transactionId,
        receiptReference,
        feeId: fee.id,
        studentId: fee.studentId,
        amount: state.outstandingAmount,
        currency: fee.currency || 'INR',
        paidAt: at,
        method: payload.method || 'upi',
        status: outcome,
        source: 'student-simulated',
        recordedBy: actor.id,
        gatewayLabel: 'Simulated demo payment — no real gateway',
        note: outcome === 'failed' ? 'Simulated failure requested in the demo; no funds moved.' : 'Student confirmed a simulated payment.',
        createdAt: at,
      }
      insert('payments', payment)

      if (outcome === 'success') {
        notify({
          userId: fee.studentId,
          type: 'fee-payment',
          title: 'Simulated payment successful',
          body: `${transactionId} recorded for ${fee.title}. Receipt ${receiptReference} is available.`,
          link: '/student/payment-dues',
          entityId: payment.id,
        })
        notifyMany(adminIds(store), {
          type: 'fee-payment',
          title: 'Student payment recorded',
          body: `${findUser(fee.studentId)?.name || fee.studentId} · ${transactionId} · ${fee.title}`,
          link: `/admin/payments?payment=${payment.id}`,
          entityId: payment.id,
        })
      } else {
        notify({
          userId: fee.studentId,
          type: 'fee-payment',
          title: 'Simulated payment failed',
          body: `${transactionId} failed in the demo. The outstanding balance is unchanged.`,
          link: '/student/payment-dues',
          entityId: payment.id,
        })
      }
      paymentAudit({
        action: 'payment.simulated',
        actionLabel: outcome === 'success' ? 'Simulated student payment succeeded' : 'Simulated student payment failed',
        payment,
        fee,
        actor,
        previous: `Outstanding ${state.outstandingAmount}`,
        next: outcome === 'success' ? `Paid ${payment.amount}` : 'Outstanding unchanged',
        reason: payment.note,
      })
      return {
        ok: outcome === 'success',
        status: outcome,
        payment: decoratePayment(payment, loadStore()),
        feeId: fee.id,
        transactionId,
        receiptReference,
        message: outcome === 'success'
          ? `Simulated payment successful. Transaction ${transactionId} · receipt ${receiptReference}.`
          : 'Simulated payment failed. No amount was applied and the outstanding balance is unchanged.',
      }
    }, { latency: 520, label: 'payment' })
  },

  /** Admin records an office/cash/bank payment against the same fee ID. */
  async recordOfflinePayment(feeId, payload = {}, actor) {
    return request(() => {
      assert(actor?.role === 'admin', 'Only Admin Workspace can record an offline payment.', { code: 'forbidden', status: 403 })
      const store = loadStore()
      const fee = store.fees.find((item) => item.id === feeId)
      assert(fee, 'That fee record does not exist.', { code: 'not-found', status: 404 })
      assertMethod(payload.method || 'cash')
      assert(String(payload.referenceNote || '').trim().length >= 4, 'Add an office reference or remark (at least 4 characters).', { code: 'validation' })
      const state = feeState(fee, store.payments, new Date())
      const amount = round(Number(payload.amount ?? state.outstandingAmount), 2)
      assert(amount > 0, 'Enter an amount greater than zero.', { code: 'validation' })
      assert(amount <= state.outstandingAmount + 0.01, 'The offline amount cannot exceed the outstanding fee balance.', { code: 'validation' })
      const parsedPaidAt = payload.paidAt ? new Date(payload.paidAt) : null
      assert(!parsedPaidAt || !Number.isNaN(parsedPaidAt.getTime()), 'Enter a valid payment date.', { code: 'validation' })
      const paidAt = parsedPaidAt ? parsedPaidAt.toISOString() : nowIso()
      const at = nowIso()
      const transactionId = nextReference(store.payments, 'VYUH-TXN-', 'transactionId')
      const receiptReference = nextReference(
        store.payments.filter((payment) => payment.receiptReference),
        'VYUH-RCP-',
        'receiptReference',
      )
      const payment = {
        id: createId('payment'),
        transactionId,
        receiptReference,
        feeId: fee.id,
        studentId: fee.studentId,
        amount,
        currency: fee.currency || 'INR',
        paidAt,
        method: payload.method || 'cash',
        status: 'success',
        source: 'admin-offline',
        recordedBy: actor.id,
        gatewayLabel: 'Offline institute record — no real gateway',
        note: String(payload.referenceNote).trim(),
        createdAt: at,
      }
      insert('payments', payment)
      notify({
        userId: fee.studentId,
        type: 'fee-payment',
        title: 'Offline payment recorded',
        body: `${transactionId} recorded by Admin for ${fee.title}. Receipt ${receiptReference} is available.`,
        link: '/student/payment-dues',
        entityId: payment.id,
      })
      paymentAudit({
        action: 'payment.offline-recorded',
        actionLabel: 'Offline payment recorded by Admin',
        payment,
        fee,
        actor,
        previous: `Outstanding ${state.outstandingAmount}`,
        next: `Paid ${amount} offline`,
        reason: payment.note,
      })
      return decoratePayment(payment, loadStore())
    }, { latency: 360, label: 'payment' })
  },

  async getReceiptData(paymentId) {
    return request(() => {
      const store = loadStore()
      const payment = store.payments.find((item) => item.id === paymentId)
      assert(payment, 'That payment does not exist.', { code: 'not-found', status: 404 })
      assert(payment.status === 'success', 'A receipt is available only for a successful payment.', { code: 'conflict', status: 409 })
      const fee = store.fees.find((item) => item.id === payment.feeId)
      assert(fee, 'The fee for that payment no longer exists.', { code: 'not-found', status: 404 })
      return {
        payment: decoratePayment(payment, store),
        fee: decorateFee(fee, store, store.payments, new Date()),
        student: publicUser(store.users.find((item) => item.id === payment.studentId)),
        institute: store.institute,
        generatedAt: nowIso(),
      }
    }, { latency: 140, label: 'payment' })
  },
}

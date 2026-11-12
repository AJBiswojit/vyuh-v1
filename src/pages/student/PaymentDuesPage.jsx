import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CreditCard,
  Download,
  FileText,
  Info,
  Inbox,
  MessageSquarePlus,
  Receipt,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { feeService } from '../../services/fee.service.js'
import { feeRequestService } from '../../services/fee-request.service.js'
import { paymentService } from '../../services/payment.service.js'
import { formatCurrency } from '../../lib/fee-calculations.js'
import { downloadReceipt } from '../../lib/receipt.js'
import { formatDate, formatDateTime } from '../../lib/time.js'
import {
  FEE_REQUEST_TYPES,
  FEE_REQUEST_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
} from '../../data/mock/fees.mock.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Field, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const FEE_FILTERS = [
  { id: 'all', label: 'All fees' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'part-paid', label: 'Part paid' },
  { id: 'paid', label: 'Paid' },
]

const REQUEST_FILTERS = [
  { id: 'all', label: 'All requests' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'resolved', label: 'Resolved' },
]

function statusBadge(status) {
  return <StatusBadge tone={statusTone(status)} dot>{statusLabel(status)}</StatusBadge>
}

function FeeCard({ fee, onPay, onRequest, paying }) {
  const progress = fee.amount ? Math.min(100, (fee.paidAmount / fee.amount) * 100) : 0
  return (
    <article className="surface-flat p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-xs">{fee.code} · {fee.categoryLabel} · {fee.approvalLabel}</p>
          <h3 className="mt-1 text-[13px] font-medium leading-snug text-ink">{fee.title}</h3>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{fee.description}</p>
        </div>
        {statusBadge(fee.paymentStatus)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[9px] border border-[var(--line)] px-2 py-1.5">
          <p className="label-xs">Billed</p>
          <p className="mt-0.5 text-[12px] font-medium tabular text-ink">{formatCurrency(fee.amount, fee.currency)}</p>
        </div>
        <div className="rounded-[9px] border border-[var(--line)] px-2 py-1.5">
          <p className="label-xs">Paid</p>
          <p className="mt-0.5 text-[12px] font-medium tabular text-ink">{formatCurrency(fee.paidAmount, fee.currency)}</p>
        </div>
        <div className={`rounded-[9px] border px-2 py-1.5 ${fee.outstandingAmount ? 'border-[var(--warn-300)] bg-[var(--warn-50)]' : 'border-[var(--good-300)] bg-[var(--good-50)]'}`}>
          <p className="label-xs">Outstanding</p>
          <p className="mt-0.5 text-[12px] font-medium tabular text-ink">{formatCurrency(fee.outstandingAmount, fee.currency)}</p>
        </div>
      </div>
      <ProgressBar
        value={progress}
        tone={fee.isPaid ? 'good' : fee.overdue ? 'danger' : fee.paidAmount > 0 ? 'warn' : 'sky'}
        height={6}
        className="mt-2.5"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10.5px] text-soft">
          Due {formatDate(fee.dueDate)}{fee.overdue ? ' · overdue' : ''} · {fee.paymentReference ? `ref ${fee.paymentReference}` : 'no payment reference yet'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" variant="secondary" icon={MessageSquarePlus} onClick={() => onRequest(fee)}>Request</Button>
          {fee.outstandingAmount > 0 ? (
            <Button size="xs" variant="primary" icon={CreditCard} onClick={() => onPay(fee)} disabled={paying}>Pay Now</Button>
          ) : null}
        </div>
      </div>
      {fee.failedPayments ? <p className="mt-1.5 text-[10px] text-soft">{fee.failedPayments} simulated failed attempt{fee.failedPayments === 1 ? '' : 's'} · balance unchanged.</p> : null}
      {fee.instalmentPlan ? (
        <details className="mt-2 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2">
          <summary className="cursor-pointer text-[10.5px] font-medium text-[var(--sky-900)]">Approved instalment schedule for existing balance</summary>
          <ul className="mt-1 space-y-0.5 text-[10px] text-[var(--sky-900)]">
            {fee.instalmentPlan.schedule.map((item) => (
              <li key={item.sequence}>{item.sequence}. {formatDate(item.dueDate)} · {formatCurrency(item.amount, fee.currency)}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  )
}

export default function PaymentDuesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('fees')
  const [feeFilter, setFeeFilter] = useState('all')
  const [requestFilter, setRequestFilter] = useState('all')
  const [payFee, setPayFee] = useState(null)
  const [payForm, setPayForm] = useState({ method: 'upi', outcome: 'success' })
  const [payResult, setPayResult] = useState(null)
  const [payPending, setPayPending] = useState(false)
  const [payError, setPayError] = useState(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestForm, setRequestForm] = useState({
    type: 'query',
    feeId: '',
    subject: '',
    description: '',
    proposedDueDate: '',
    requestedInstalments: 2,
  })
  const [requestError, setRequestError] = useState(null)
  const [requestPending, setRequestPending] = useState(false)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyPending, setReplyPending] = useState(null)

  const actor = useMemo(() => ({ id: user.id, role: 'student', name: user.name }), [user.id, user.name])
  const fees = useAsync(() => feeService.getStudentFees(user.id), [user.id])

  const data = fees.data
  const summary = data?.summary || {}
  const pendingRequests = (data?.requests || []).filter((request) => request.status === 'pending')
  const filteredFees = useMemo(() => {
    const rows = data?.fees || []
    if (feeFilter === 'outstanding') return rows.filter((fee) => fee.outstandingAmount > 0)
    if (feeFilter === 'overdue') return rows.filter((fee) => fee.overdue)
    if (feeFilter === 'part-paid') return rows.filter((fee) => fee.paymentStatus === 'part-paid')
    if (feeFilter === 'paid') return rows.filter((fee) => fee.paymentStatus === 'paid')
    return rows
  }, [data, feeFilter])
  const filteredRequests = useMemo(() => {
    const rows = data?.requests || []
    return requestFilter === 'all' ? rows : rows.filter((request) => request.status === requestFilter)
  }, [data, requestFilter])

  const openPayModal = (fee) => {
    setPayFee(fee)
    setPayResult(null)
    setPayError(null)
    setPayForm({ method: 'upi', outcome: 'success' })
  }

  const openRequestModal = (fee = null) => {
    setRequestOpen(true)
    setRequestError(null)
    setRequestForm({
      type: 'query',
      feeId: fee?.id || '',
      subject: fee ? `Question about ${fee.code}` : '',
      description: '',
      proposedDueDate: '',
      requestedInstalments: 2,
    })
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    setPayError(null)
    setPayPending(true)
    try {
      const result = await paymentService.simulatePayment(payFee.id, payForm, actor)
      setPayResult(result)
      await fees.refresh()
      if (result.ok) toast.success('Simulated payment successful', `${result.transactionId} · ${result.receiptReference}`)
      else toast.error('Simulated payment failed', 'No amount was applied and the balance is unchanged.')
    } catch (caught) {
      setPayError(caught?.message || 'The simulated payment could not be recorded.')
    } finally {
      setPayPending(false)
    }
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    setRequestError(null)
    setRequestPending(true)
    try {
      const created = await feeRequestService.createRequest(requestForm, actor)
      setRequestOpen(false)
      setTab('requests')
      await fees.refresh()
      toast.success('Fee request raised', `${created.code || created.id} is awaiting Admin review.`)
    } catch (caught) {
      setRequestError(caught?.message || 'The fee request could not be raised.')
    } finally {
      setRequestPending(false)
    }
  }

  const submitRequestReply = async (requestId) => {
    const body = String(replyDrafts[requestId] || '').trim()
    if (!body) return
    setReplyPending(requestId)
    try {
      await feeRequestService.replyToRequest(requestId, body, actor)
      setReplyDrafts((current) => ({ ...current, [requestId]: '' }))
      await fees.refresh()
      toast.success('Response added', 'Admin Support is notified in-app.')
    } catch (caught) {
      toast.error('Response failed', caught?.message)
    } finally {
      setReplyPending(null)
    }
  }

  const handleReceipt = async (paymentId) => {
    try {
      const receipt = await feeService.getReceiptData(paymentId)
      if (!downloadReceipt(receipt)) throw new Error('This browser could not create a downloadable demonstration receipt.')
      toast.success('Receipt downloaded', `${receipt.payment.receiptReference || receipt.payment.transactionId}.html`)
    } catch (caught) {
      toast.error('Receipt unavailable', caught?.message)
    }
  }

  if (fees.loading && !data) {
    return <div><PageHeader eyebrow="Student workspace" title="Payment & Dues" /><LoadingBlock rows={8} /></div>
  }

  if (fees.error) {
    return <div><PageHeader eyebrow="Student workspace" title="Payment & Dues" /><ErrorState error={fees.error} onRetry={fees.refresh} title="Fee records could not be loaded" /></div>
  }

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Payment & Dues"
        description="Approved course fee records, derived balances, simulated local payments, downloadable demonstration receipts and fee requests in one place."
        actions={
          <Button size="sm" variant="secondary" icon={MessageSquarePlus} onClick={() => openRequestModal()}>
            Raise fee request
          </Button>
        }
      />

      <section className="surface-sky p-4 sm:p-5" aria-labelledby="fee-summary-heading">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="page-eyebrow">Fee summary</p>
            <h2 id="fee-summary-heading" className="mt-1 text-[15px] font-medium text-[var(--sky-900)]">{data.student?.name || user.name} · {data.student?.enrollmentId || 'Student'}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--sky-800)]">Balances are derived from successful local transactions only. Failed or pending records do not reduce a balance.</p>
          </div>
          <StatusBadge tone={summary.overdueCount ? 'danger' : 'good'} dot>
            {summary.overdueCount ? `${summary.overdueCount} overdue` : 'No overdue fee'}
          </StatusBadge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total billed', value: formatCurrency(summary.totalFees), hint: `${summary.feeCount} approved fee records` },
            { label: 'Total paid', value: formatCurrency(summary.totalPaid), hint: `${summary.collectionRate}% collection rate` },
            { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding), hint: `${summary.overdueCount} overdue · ${summary.partPaidCount} part paid` },
            { label: 'Next deadline', value: summary.nextDueAt ? formatDate(summary.nextDueAt) : 'No upcoming deadline', hint: summary.nextDueFee?.title || 'All scheduled fees clear' },
          ].map((item) => (
            <div key={item.label} className="rounded-[10px] border border-[var(--sky-200)] bg-white/85 p-2.5">
              <p className="label-xs">{item.label}</p>
              <p className="mt-1 text-[15px] font-medium tabular text-ink">{item.value}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-soft">{item.hint}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-1.5 rounded-[9px] border border-[var(--sky-200)] bg-white/70 p-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sky-800)]" aria-hidden="true" />
          <p className="text-[10.5px] leading-relaxed text-[var(--sky-900)]">
            {data.simulationNote} No real gateway is contacted and no UPI ID, bank account, card number, PIN or CVV is requested. A successful record creates a transaction ID, receipt reference and a printable HTML receipt.
          </p>
        </div>
      </section>

      <div className="tab-row mt-4" role="tablist" aria-label="Payment and dues views">
        <button type="button" role="tab" aria-selected={tab === 'fees'} className="tab" onClick={() => setTab('fees')}>Fee records</button>
        <button type="button" role="tab" aria-selected={tab === 'payments'} className="tab" onClick={() => setTab('payments')}>Payment history</button>
        <button type="button" role="tab" aria-selected={tab === 'requests'} className="tab" onClick={() => setTab('requests')}>Requests & decisions {pendingRequests.length ? <span className="ml-1 rounded-full bg-[var(--warn-100)] px-1.5 py-0.5 text-[9px] text-[var(--warn-800)]">{pendingRequests.length}</span> : null}</button>
      </div>

      {tab === 'fees' ? (
        <section aria-labelledby="fee-records-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="fee-records-heading" className="display-sm text-ink">Approved fee records</h2>
            <div className="flex flex-wrap items-center gap-1">
              {FEE_FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={feeFilter === option.id}
                  onClick={() => setFeeFilter(option.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[10.5px] transition ${feeFilter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {filteredFees.length === 0 ? (
            <div className="surface-flat"><EmptyState compact icon={Wallet} title="No fees match this filter" description="Choose another fee status to see the approved charge records." /></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredFees.map((fee) => (
                <FeeCard key={fee.id} fee={fee} onPay={openPayModal} onRequest={openRequestModal} paying={payPending} />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[var(--line)] bg-white p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">
              Fee amounts are authored only in the demo course fee plan or created by Admin Workspace. This page never invents a charge. Approved extension and instalment decisions update the same fee record and remain visible here.
            </p>
          </div>
        </section>
      ) : null}

      {tab === 'payments' ? (
        <section aria-labelledby="payment-history-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="payment-history-heading" className="display-sm text-ink">Payment history</h2>
            <span className="text-[10.5px] text-soft">Latest: {summary.latestPaymentLabel} · {summary.latestPayment?.transactionId || 'No transaction yet'}</span>
          </div>
          <div className="surface-flat overflow-hidden">
            {(data.payments || []).length === 0 ? (
              <EmptyState icon={Receipt} title="No payment records yet" description="A simulated Pay Now action or an Admin offline record appears here with a stable transaction ID." />
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Fee record</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th className="align-right">Amount</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.payments || []).map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <p className="font-mono text-[10.5px] font-medium text-ink">{payment.transactionId}</p>
                          <p className="mt-0.5 text-[9.5px] text-soft">{payment.receiptReference || 'No receipt reference'}</p>
                        </td>
                        <td><span className="text-[11.5px] font-medium text-ink">{payment.feeTitle}</span><span className="block text-[10px] text-soft">{payment.feeCode}</span></td>
                        <td>{payment.methodLabel}<span className="block text-[9.5px] text-soft">{payment.source === 'admin-offline' ? 'Admin offline record' : 'Local simulation'}</span></td>
                        <td className="whitespace-nowrap text-[10.5px]">{formatDateTime(payment.paidAt)}</td>
                        <td className="align-right font-medium tabular">{formatCurrency(payment.amount, payment.currency)}</td>
                        <td>{statusBadge(payment.status)}{payment.status === 'failed' ? <span className="mt-0.5 block text-[9.5px] text-soft">Balance unchanged</span> : null}</td>
                        <td>
                          {payment.status === 'success' ? (
                            <Button size="xs" variant="secondary" icon={Download} onClick={() => handleReceipt(payment.id)}>Download</Button>
                          ) : <span className="text-[10px] text-soft">Not available</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(data.payments || []).slice(0, 3).map((payment) => (
              <div key={payment.id} className="surface-sunken p-3">
                <p className="label-xs">{payment.status === 'success' ? 'Successful transaction' : 'Failed simulation'}</p>
                <p className="mt-1 font-mono text-[10.5px] text-ink">{payment.transactionId}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-soft">{payment.note || 'Local demonstration record.'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'requests' ? (
        <section aria-labelledby="fee-requests-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="fee-requests-heading" className="display-sm text-ink">Fee requests & Admin decisions</h2>
            <div className="flex flex-wrap items-center gap-1">
              {REQUEST_FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={requestFilter === option.id}
                  onClick={() => setRequestFilter(option.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[10.5px] transition ${requestFilter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="surface-flat">
              <EmptyState
                icon={Inbox}
                title="No matching fee requests"
                description="Raise a query, correction/dispute, deadline extension or instalment request. Admin decisions share the same request ID."
                action={<Button size="sm" variant="primary" icon={MessageSquarePlus} onClick={() => openRequestModal()}>Raise fee request</Button>}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <article key={request.id} className="surface-flat p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="label-xs">{request.code || request.id} · {request.typeLabel} · {request.feeCode}</p>
                      <h3 className="mt-1 text-[13px] font-medium text-ink">{request.subject}</h3>
                      <p className="mt-0.5 text-[10.5px] text-soft">{request.feeTitle} · raised {formatDate(request.createdAt)}</p>
                    </div>
                    <StatusBadge tone={statusTone(request.status)} dot>{FEE_REQUEST_STATUS_LABELS[request.status] || request.status}</StatusBadge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{request.description}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {request.proposedDueDate ? <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Proposed date</p><p className="mt-0.5 text-[11px] text-ink">{formatDate(request.proposedDueDate)}</p></div> : null}
                    {request.requestedInstalments ? <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Instalments</p><p className="mt-0.5 text-[11px] text-ink">{request.requestedInstalments}</p></div> : null}
                    <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Reviewed</p><p className="mt-0.5 text-[11px] text-ink">{request.reviewedAt ? formatDate(request.reviewedAt) : 'Awaiting Admin'}</p></div>
                  </div>
                  {request.decisionNote ? (
                    <div className="mt-2 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2">
                      <p className="text-[10.5px] font-medium text-[var(--sky-900)]">Admin decision</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--sky-900)]">{request.decisionNote}</p>
                    </div>
                  ) : null}
                  <ol className="support-timeline mt-3">
                    {(request.replies || []).map((reply) => (
                      <li key={reply.id} className="support-timeline-item">
                        <span className={`support-timeline-dot ${reply.kind === 'decision' ? 'is-status' : ''}`} aria-hidden="true" />
                        <div>
                          <p className="text-[10.5px] font-medium text-ink">{reply.authorName} · {formatDateTime(reply.at)} {reply.decision ? `· ${FEE_REQUEST_STATUS_LABELS[reply.decision]}` : ''}</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">{reply.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex items-end gap-2 border-t border-[var(--line)] pt-2">
                    <TextArea
                      rows={2}
                      value={replyDrafts[request.id] || ''}
                      onChange={(event) => setReplyDrafts((current) => ({ ...current, [request.id]: event.target.value }))}
                      placeholder="Add context to the same request thread"
                      aria-label={`Reply to fee request ${request.code || request.id}`}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Send}
                      loading={replyPending === request.id}
                      disabled={!String(replyDrafts[request.id] || '').trim()}
                      onClick={() => submitRequestReply(request.id)}
                    >
                      Reply
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <Modal
        open={Boolean(payFee)}
        onClose={() => setPayFee(null)}
        title="Simulated Pay Now"
        description="This is a local demonstration record. No real payment gateway is contacted and no banking or card credentials are collected."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPayFee(null)}>Close</Button>
            {payResult?.ok ? (
              <Button size="sm" variant="secondary" icon={Download} onClick={() => handleReceipt(payResult.payment.id)}>Download receipt</Button>
            ) : (
              <Button size="sm" variant="primary" type="submit" form="simulated-payment-form" icon={CreditCard} loading={payPending}>Confirm simulated payment</Button>
            )}
          </div>
        }
      >
        {payFee ? (
          <div className="space-y-3.5">
            <div className="surface-sunken p-3">
              <p className="label-xs">Fee record</p>
              <p className="mt-1 text-[12.5px] font-medium text-ink">{payFee.title}</p>
              <p className="mt-0.5 text-[10.5px] text-soft">{payFee.code} · due {formatDate(payFee.dueDate)}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div><dt className="label-xs">Billed</dt><dd className="font-medium text-ink">{formatCurrency(payFee.amount, payFee.currency)}</dd></div>
                <div><dt className="label-xs">Paid</dt><dd className="font-medium text-ink">{formatCurrency(payFee.paidAmount, payFee.currency)}</dd></div>
                <div><dt className="label-xs">To pay</dt><dd className="font-medium text-ink">{formatCurrency(payFee.outstandingAmount, payFee.currency)}</dd></div>
              </dl>
            </div>
            <form id="simulated-payment-form" onSubmit={submitPayment} className="space-y-3" noValidate>
              <Select label="Demo payment method" value={payForm.method} onChange={(event) => setPayForm((current) => ({ ...current, method: event.target.value }))}>
                {PAYMENT_METHODS.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
              </Select>
              <Field label="Demo outcome" hint="Choose failure to see that a failed transaction does not reduce the outstanding balance.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { id: 'success', label: 'Success', description: 'Creates a transaction ID, receipt reference and downloadable demonstration receipt.' },
                    { id: 'failure', label: 'Failure', description: 'Creates a failed local record only; no amount is applied.' },
                  ].map((option) => (
                    <label key={option.id} className={`cursor-pointer rounded-[10px] border p-2.5 ${payForm.outcome === option.id ? 'border-[var(--sky-600)] bg-[var(--sky-50)]' : 'border-[var(--line)] bg-white'}`}>
                      <span className="flex items-center gap-2 text-[11.5px] font-medium text-ink">
                        <input type="radio" name="payment-outcome" className="accent-[var(--ink)]" checked={payForm.outcome === option.id} onChange={() => setPayForm((current) => ({ ...current, outcome: option.id }))} />
                        {option.label}
                      </span>
                      <span className="mt-1 block text-[10px] leading-snug text-soft">{option.description}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="flex items-start gap-1.5 rounded-[9px] border border-[var(--cream-300)] bg-[var(--cream-100)] p-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn-800)]" aria-hidden="true" />
                <p className="text-[10px] leading-relaxed text-[var(--cream-900)]">Do not enter a UPI ID, bank account, card number, PIN or CVV. This form deliberately has no such fields.</p>
              </div>
              <FormError>{payError}</FormError>
            </form>
            {payResult ? (
              <div className={`rounded-[10px] border p-3 ${payResult.ok ? 'border-[var(--good-300)] bg-[var(--good-50)]' : 'border-[var(--bad-300)] bg-[var(--bad-50)]'}`} role="status">
                <div className="flex items-center gap-1.5">
                  {payResult.ok ? <ShieldCheck className="h-3.5 w-3.5 text-[var(--good-800)]" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5 text-[var(--bad-700)]" aria-hidden="true" />}
                  <p className="text-[11.5px] font-medium text-ink">{payResult.ok ? 'Local payment record created' : 'Local failed record created'}</p>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{payResult.message}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px]">
                  <div><dt className="text-soft">Transaction ID</dt><dd className="font-mono text-ink">{payResult.transactionId}</dd></div>
                  <div><dt className="text-soft">Receipt reference</dt><dd className="font-mono text-ink">{payResult.receiptReference || '—'}</dd></div>
                  <div><dt className="text-soft">Status</dt><dd className="text-ink">{PAYMENT_STATUS_LABELS[payResult.status]}</dd></div>
                  <div><dt className="text-soft">Method</dt><dd className="text-ink">{payForm.method}</dd></div>
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Raise a fee request"
        description="Queries, corrections/disputes, deadline extensions and instalment requests share one ID with the Admin decision."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" type="submit" form="fee-request-form" icon={Send} loading={requestPending}>Submit request</Button>
          </div>
        }
      >
        <form id="fee-request-form" className="space-y-3.5" onSubmit={submitRequest} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Request type" value={requestForm.type} onChange={(event) => setRequestForm((current) => ({ ...current, type: event.target.value }))}>
              {FEE_REQUEST_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
            </Select>
            <Select label="Fee record" value={requestForm.feeId} onChange={(event) => setRequestForm((current) => ({ ...current, feeId: event.target.value }))} hint={requestForm.type === 'query' ? 'Optional for a general query.' : 'Required for this request type.'}>
              <option value="">General fee query</option>
              {(data.fees || []).map((fee) => <option key={fee.id} value={fee.id}>{fee.code} · {fee.title}</option>)}
            </Select>
          </div>
          <TextInput
            label="Subject"
            required
            value={requestForm.subject}
            onChange={(event) => setRequestForm((current) => ({ ...current, subject: event.target.value }))}
            placeholder="One line describing the request"
          />
          <TextArea
            label="Details"
            required
            rows={4}
            value={requestForm.description}
            onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Explain the record, amount, date or schedule you want Admin to review."
          />
          {requestForm.type === 'extension' ? (
            <TextInput
              type="date"
              label="Proposed later deadline"
              required
              value={requestForm.proposedDueDate}
              onChange={(event) => setRequestForm((current) => ({ ...current, proposedDueDate: event.target.value }))}
            />
          ) : null}
          {requestForm.type === 'instalment' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Requested instalments" value={requestForm.requestedInstalments} onChange={(event) => setRequestForm((current) => ({ ...current, requestedInstalments: event.target.value }))}>
                {[2, 3, 4].map((count) => <option key={count} value={count}>{count} instalments</option>)}
              </Select>
              <TextInput type="date" label="First instalment date (optional)" value={requestForm.proposedDueDate} onChange={(event) => setRequestForm((current) => ({ ...current, proposedDueDate: event.target.value }))} />
            </div>
          ) : null}
          {requestForm.type === 'correction' ? (
            <p className="flex items-start gap-1.5 rounded-[9px] border border-[var(--line)] bg-[var(--surface-sunken)] p-2 text-[10px] leading-relaxed text-muted">
              <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Admin may approve with a corrected amount. The corrected fee cannot be lower than the amount already paid.
            </p>
          ) : null}
          <FormError>{requestError}</FormError>
        </form>
      </Modal>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  CreditCard,
  Download,
  FileText,
  Inbox,
  Info,
  MessageSquare,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { feeService } from '../../services/fee.service.js'
import { feeRequestService } from '../../services/fee-request.service.js'
import { paymentService } from '../../services/payment.service.js'
import { adminService } from '../../services/admin.service.js'
import { formatCurrency } from '../../lib/fee-calculations.js'
import { downloadReceipt } from '../../lib/receipt.js'
import { formatDate, formatDateTime } from '../../lib/time.js'
import {
  FEE_CATEGORY_LABELS,
  FEE_REQUEST_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
} from '../../data/mock/fees.mock.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Field, FormError } from '../../ui/fields.jsx'
import { DonutChart, ComparisonBars, CHART_TONE } from '../../ui/charts.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const TABS = [
  { id: 'overview', label: 'Overview & reports' },
  { id: 'fees', label: 'Fee records' },
  { id: 'payments', label: 'Transactions' },
  { id: 'requests', label: 'Fee requests' },
]

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function StatusCell({ status }) {
  return <StatusBadge tone={statusTone(status)} dot>{statusLabel(status)}</StatusBadge>
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const requestParam = searchParams.get('request')
  const paymentParam = searchParams.get('payment')

  const [tab, setTab] = useState(requestParam ? 'requests' : tabParam || 'overview')
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('all')
  const [feeFilter, setFeeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [requestFilter, setRequestFilter] = useState('all')
  const [requestedRequestId, setRequestedRequestId] = useState(requestParam || null)
  const [feeModal, setFeeModal] = useState(null)
  const [feeForm, setFeeForm] = useState({ studentId: '', category: 'tuition', title: '', description: '', amount: '', dueDate: '' })
  const [offlineFee, setOfflineFee] = useState(null)
  const [offlineForm, setOfflineForm] = useState({ amount: '', method: 'cash', referenceNote: '', paidAt: '' })
  const [decisionForm, setDecisionForm] = useState({ decision: 'approved', note: '', correctedAmount: '' })
  const [replyDrafts, setReplyDrafts] = useState({})
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState(null)

  const actor = useMemo(() => ({ id: user.id, role: 'admin', name: user.name }), [user.id, user.name])
  const workspace = useAsync(() => feeService.getAdminFees(), [])
  const report = useAsync(() => adminService.getReportData('report_fee_dues', { batchId: batchFilter }), [batchFilter])

  const data = workspace.data
  const summary = data?.summary || {}
  const reports = data?.reports || { byCategory: [], byBatch: [], byMonth: [] }
  const requestList = data?.requests || []
  const selectedRequestId = requestList.length
    ? (requestList.some((item) => item.id === requestedRequestId) ? requestedRequestId : requestList[0].id)
    : requestedRequestId
  const selectedRequest = requestList.find((request) => request.id === selectedRequestId) || null
  const batches = useMemo(() => [...new Set((data?.fees || []).map((fee) => fee.batchName))].sort(), [data])

  const changeTab = (next) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    params.delete('request')
    params.delete('payment')
    setSearchParams(params, { replace: true })
  }

  const openFeeModal = (fee = null) => {
    setActionError(null)
    setFeeModal(fee ? { mode: 'edit', fee } : { mode: 'create', fee: null })
    setFeeForm(fee ? {
      studentId: fee.studentId,
      category: fee.category,
      title: fee.title,
      description: fee.description,
      amount: fee.amount,
      dueDate: String(fee.dueDate || '').slice(0, 10),
    } : {
      studentId: data?.students?.[0]?.id || '',
      category: 'tuition',
      title: '',
      description: '',
      amount: '',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    })
  }

  const openOfflineModal = (fee) => {
    setActionError(null)
    setOfflineFee(fee)
    setOfflineForm({
      amount: fee.outstandingAmount,
      method: 'cash',
      referenceNote: '',
      paidAt: new Date().toISOString().slice(0, 10),
    })
  }

  const submitFee = async (event) => {
    event.preventDefault()
    setActionError(null)
    setActionPending(true)
    try {
      if (feeModal.mode === 'edit') {
        await feeService.updateFee(feeModal.fee.id, {
          category: feeForm.category,
          title: feeForm.title,
          description: feeForm.description,
          amount: feeForm.amount,
          dueDate: feeForm.dueDate,
        }, actor)
        toast.success('Fee record updated', `${feeModal.fee.code} remains an approved record.`)
      } else {
        const created = await feeService.createFee(feeForm, actor)
        toast.success('Approved fee created', `${created.code} is visible in Student Payment & Dues.`)
      }
      setFeeModal(null)
      await workspace.refresh()
      await report.refresh()
    } catch (caught) {
      setActionError(caught?.message || 'The fee record could not be saved.')
    } finally {
      setActionPending(false)
    }
  }

  const submitOfflinePayment = async (event) => {
    event.preventDefault()
    setActionError(null)
    setActionPending(true)
    try {
      const payment = await paymentService.recordOfflinePayment(offlineFee.id, offlineForm, actor)
      setOfflineFee(null)
      await workspace.refresh()
      await report.refresh()
      toast.success('Offline payment recorded', `${payment.transactionId} · receipt ${payment.receiptReference}`)
    } catch (caught) {
      setActionError(caught?.message || 'The offline payment could not be recorded.')
    } finally {
      setActionPending(false)
    }
  }

  const submitDecision = async (event) => {
    event.preventDefault()
    setActionError(null)
    setActionPending(true)
    try {
      const options = decisionForm.correctedAmount !== ''
        ? { correctedAmount: decisionForm.correctedAmount }
        : {}
      const result = await feeRequestService.reviewRequest(
        selectedRequest.id,
        decisionForm.decision,
        decisionForm.note,
        actor,
        options,
      )
      setDecisionForm((current) => ({ ...current, note: '', correctedAmount: '' }))
      await workspace.refresh()
      toast.success('Fee request reviewed', `${result.request.code || result.request.id} · ${result.changeNote}`)
    } catch (caught) {
      setActionError(caught?.message || 'The decision could not be recorded.')
    } finally {
      setActionPending(false)
    }
  }

  const submitReply = async (requestId) => {
    const body = String(replyDrafts[requestId] || '').trim()
    if (!body) return
    setActionPending(true)
    try {
      await feeRequestService.replyToRequest(requestId, body, actor)
      setReplyDrafts((current) => ({ ...current, [requestId]: '' }))
      await workspace.refresh()
      toast.success('Admin response added', 'The student is notified in-app.')
    } catch (caught) {
      toast.error('Response failed', caught?.message)
    } finally {
      setActionPending(false)
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

  const exportReport = async () => {
    try {
      const result = await adminService.getReportData('report_fee_dues', { batchId: batchFilter })
      const header = result.columns.map((column) => column.label)
      const body = result.rows.map((row) => result.columns.map((column) => row[column.key] ?? ''))
      const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `vyuh-fees-dues-${batchFilter}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
      toast.success('Fees & dues report exported', `${result.rows.length} rows written to CSV.`)
    } catch (caught) {
      toast.error('Export failed', caught?.message)
    }
  }

  const matchesFee = (fee) => {
    const needle = search.trim().toLowerCase()
    return (!needle || [fee.code, fee.title, fee.studentName, fee.enrollmentId, fee.batchName, fee.categoryLabel].some((value) => String(value || '').toLowerCase().includes(needle)))
      && (batchFilter === 'all' || fee.batchName === batchFilter || fee.batchId === batchFilter)
      && (feeFilter === 'all' || fee.paymentStatus === feeFilter || (feeFilter === 'overdue' && fee.overdue))
  }

  const matchesPayment = (payment) => {
    const needle = search.trim().toLowerCase()
    return (!needle || [payment.transactionId, payment.receiptReference, payment.studentName, payment.feeTitle, payment.feeCode].some((value) => String(value || '').toLowerCase().includes(needle)))
      && (paymentFilter === 'all' || payment.status === paymentFilter)
  }

  const matchesRequest = (request) => {
    const needle = search.trim().toLowerCase()
    return (!needle || [request.code, request.subject, request.studentName, request.feeCode].some((value) => String(value || '').toLowerCase().includes(needle)))
      && (requestFilter === 'all' || request.status === requestFilter)
  }

  if (workspace.loading && !data) {
    return <div><PageHeader eyebrow="Admin workspace" title="Payments & Dues" /><LoadingBlock rows={8} /></div>
  }

  if (workspace.error) {
    return <div><PageHeader eyebrow="Admin workspace" title="Payments & Dues" /><ErrorState error={workspace.error} onRetry={workspace.refresh} title="Fee workspace could not be loaded" /></div>
  }

  const donutData = [
    { name: 'Paid', value: summary.totalPaid || 0, color: CHART_TONE.good, label: formatCurrency(summary.totalPaid) },
    { name: 'Outstanding', value: summary.totalOutstanding || 0, color: CHART_TONE.warn, label: formatCurrency(summary.totalOutstanding) },
  ]
  const categoryData = reports.byCategory.map((item) => ({
    name: item.label,
    label: item.label,
    billedPercent: item.billed ? Math.round((item.billed / Math.max(summary.totalFees, 1)) * 100) : 0,
    collection: item.billed ? Math.round((item.paid / item.billed) * 100) : 0,
    tooltipLabel: `${item.label} · ${formatCurrency(item.billed)} billed · ${formatCurrency(item.paid)} paid · ${formatCurrency(item.outstanding)} outstanding`,
  }))

  return (
    <div>
      <PageHeader
        eyebrow="Admin workspace"
        title="Payments & Dues"
        description="Manage approved fee records, derived balances, local simulated transactions, offline payments, fee requests and the Fees & Dues report."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Download} onClick={exportReport}>Export CSV</Button>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => openFeeModal()}>Create approved fee</Button>
          </div>
        }
      />

      <div className="tab-row mb-4" role="tablist" aria-label="Payments and dues sections">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="tab" onClick={() => changeTab(item.id)}>
            {item.label}
            {item.id === 'requests' && data.pendingRequests?.length ? <span className="ml-1 rounded-full bg-[var(--warn-100)] px-1.5 py-0.5 text-[9px] text-[var(--warn-800)]">{data.pendingRequests.length}</span> : null}
          </button>
        ))}
      </div>

      <section className="surface-sky p-3.5">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
          <Field label="Search students, fee IDs and transaction IDs" htmlFor="admin-payment-search">
            <input id="admin-payment-search" className="field-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Aarav, FEE-, VYUH-TXN-" />
          </Field>
          <Select label="Batch" value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}>
            <option value="all">All batches</option>
            {batches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
          </Select>
          <div className="flex items-end">
            <div className="w-full rounded-[9px] border border-[var(--sky-200)] bg-white/75 px-2.5 py-2">
              <p className="label-xs">Shared source of truth</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--sky-900)]">Charges are seeded from course fee plans or Admin actions; balances derive from successful payments.</p>
            </div>
          </div>
        </div>
      </section>

      {tab === 'overview' ? (
        <div className="mt-4 space-y-4">
          <section aria-labelledby="fee-overview-heading">
            <h2 id="fee-overview-heading" className="mb-3 display-sm text-ink">Institute fee overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total billed', value: formatCurrency(summary.totalFees), hint: `${summary.feeCount} approved records` },
                { label: 'Collected', value: formatCurrency(summary.totalPaid), hint: `${summary.collectionRate}% collection rate` },
                { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding), hint: `${data.outstandingRows?.length || 0} fee records` },
                { label: 'Overdue / requests', value: `${summary.overdueCount || 0} / ${data.pendingRequests?.length || 0}`, hint: 'Overdue records / pending decisions' },
              ].map((stat) => (
                <div key={stat.label} className="stat-tile">
                  <p className="label-xs">{stat.label}</p>
                  <p className="stat-figure mt-1.5 text-ink">{stat.value}</p>
                  <p className="stat-tile-hint">{stat.hint}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
              <h3 className="text-[13px] font-medium text-ink">Collected vs outstanding</h3>
              <p className="mt-0.5 text-[10.5px] text-soft">Successful transactions only.</p>
              <DonutChart
                data={donutData}
                height={190}
                innerRadius={52}
                outerRadius={74}
                centerValue={`${summary.collectionRate}%`}
                centerLabel="collected"
                tooltipFormatter={(entry) => `${entry.label} · ${Math.round((entry.value / Math.max(summary.totalFees, 1)) * 100)}% of ${formatCurrency(summary.totalFees)} billed`}
              />
              <div className="mt-2 space-y-1">
                {donutData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="legend-key" style={{ '--key': entry.color }}>{entry.name}</span>
                    <span className="font-medium tabular text-ink">{entry.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-sky p-4 sm:p-5 lg:col-span-8">
              <h3 className="text-[13px] font-medium text-[var(--sky-900)]">Collection rate by fee category</h3>
              <p className="mt-0.5 text-[10.5px] text-[var(--sky-800)]">Percent of each category's billed amount that successful payments cover.</p>
              <div className="mt-3">
                <ComparisonBars
                  data={categoryData}
                  xKey="label"
                  series={[
                    { key: 'billedPercent', name: 'Share of total billing %', color: CHART_TONE.sky },
                    { key: 'collection', name: 'Collection rate %', color: CHART_TONE.primary },
                  ]}
                  unit="%"
                  height={220}
                />
              </div>
              <div className="mt-2 space-y-1">
                {reports.byCategory.map((item) => (
                  <div key={item.category} className="flex flex-wrap justify-between gap-2 border-t border-[var(--sky-200)] pt-1 text-[10px] text-[var(--sky-900)]">
                    <span className="font-medium">{item.label} · {item.count} fees</span>
                    <span className="tabular">Billed {formatCurrency(item.billed)} · Paid {formatCurrency(item.paid)} · Outstanding {formatCurrency(item.outstanding)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface-cream p-4 sm:p-5">
              <h3 className="text-[13px] font-medium text-[var(--cream-900)]">Batch-wise dues</h3>
              <div className="table-scroll mt-2">
                <table className="data-table">
                  <thead><tr><th>Batch</th><th className="align-right">Billed</th><th className="align-right">Paid</th><th className="align-right">Outstanding</th><th className="align-right">Overdue</th></tr></thead>
                  <tbody>
                    {reports.byBatch.map((row) => (
                      <tr key={row.batchName}>
                        <td className="font-medium text-ink">{row.batchName}</td>
                        <td className="align-right tabular">{formatCurrency(row.billed)}</td>
                        <td className="align-right tabular">{formatCurrency(row.paid)}</td>
                        <td className="align-right tabular font-medium">{formatCurrency(row.outstanding)}</td>
                        <td className="align-right tabular">{row.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="surface-flat p-4 sm:p-5">
              <h3 className="text-[13px] font-medium text-ink">Monthly collection report</h3>
              <p className="mt-0.5 text-[10.5px] text-soft">Derived from successful payment dates; failed transactions are excluded.</p>
              <div className="mt-2 space-y-1.5">
                {reports.byMonth.length ? reports.byMonth.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--line)] px-2.5 py-2">
                    <span className="text-[11px] font-medium text-ink">{row.key}</span>
                    <span className="text-[10.5px] text-muted">{row.transactions} transaction{row.transactions === 1 ? '' : 's'}</span>
                    <span className="text-[12px] font-medium tabular text-ink">{formatCurrency(row.collected)}</span>
                  </div>
                )) : <EmptyState compact icon={FileText} title="No successful payment month" description="Monthly figures appear after successful local transactions." />}
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-[9px] border border-[var(--line)] bg-[var(--surface-sunken)] p-2">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-soft" aria-hidden="true" />
                <p className="text-[10px] leading-relaxed text-muted">Export CSV uses the shared Fees & Dues report definition and the selected batch filter. The same report is available on Admin Reports.</p>
              </div>
              {report.error ? <p className="mt-2 text-[10px] text-[var(--bad-700)]">Report: {report.error.message}</p> : null}
            </section>
          </div>

          <div className="surface-sunken flex items-start gap-2 p-3">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">{data.simulationNote} Offline records are also local demonstration records. No UPI ID, bank account, card number, PIN or CVV is collected anywhere in this workspace.</p>
          </div>
        </div>
      ) : null}

      {tab === 'fees' ? (
        <section className="mt-4" aria-labelledby="admin-fee-records-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="admin-fee-records-heading" className="display-sm text-ink">Approved fee records</h2>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'part-paid', label: 'Part paid' },
                { id: 'paid', label: 'Paid' },
                { id: 'overdue', label: 'Overdue' },
              ].map((option) => (
                <button key={option.id} type="button" aria-pressed={feeFilter === option.id} onClick={() => setFeeFilter(option.id)} className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${feeFilter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}>{option.label}</button>
              ))}
            </div>
          </div>
          <div className="surface-flat overflow-hidden">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fee / student</th>
                    <th>Batch / course</th>
                    <th className="align-right">Billed</th>
                    <th className="align-right">Paid</th>
                    <th className="align-right">Outstanding</th>
                    <th>Due date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.fees || []).filter(matchesFee).map((fee) => (
                    <tr key={fee.id}>
                      <td>
                        <p className="font-medium text-ink">{fee.title}</p>
                        <p className="text-[10px] text-soft">{fee.code} · {fee.categoryLabel} · {fee.studentName}</p>
                      </td>
                      <td className="text-[10.5px]">{fee.batchName}<span className="block text-soft">{fee.courseName}</span></td>
                      <td className="align-right tabular">{formatCurrency(fee.amount, fee.currency)}</td>
                      <td className="align-right tabular">{formatCurrency(fee.paidAmount, fee.currency)}</td>
                      <td className="align-right tabular font-medium">{formatCurrency(fee.outstandingAmount, fee.currency)}</td>
                      <td className="whitespace-nowrap text-[10.5px]">{formatDate(fee.dueDate)}</td>
                      <td><StatusCell status={fee.paymentStatus} /><span className="mt-0.5 block text-[9.5px] text-soft">{fee.approvalLabel}</span></td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Button size="xs" variant="secondary" icon={FileText} onClick={() => openFeeModal(fee)}>Edit</Button>
                          {fee.outstandingAmount > 0 ? <Button size="xs" variant="primary" icon={CreditCard} onClick={() => openOfflineModal(fee)}>Record payment</Button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data.fees || []).filter(matchesFee).length === 0 ? <EmptyState compact icon={Inbox} title="No matching fee records" description="Try another status, batch or search term." /> : null}
          </div>
        </section>
      ) : null}

      {tab === 'payments' ? (
        <section className="mt-4" aria-labelledby="admin-transactions-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="admin-transactions-heading" className="display-sm text-ink">Transactions</h2>
            <div className="flex flex-wrap gap-1">
              {[{ id: 'all', label: 'All' }, { id: 'success', label: 'Successful' }, { id: 'failed', label: 'Failed' }, { id: 'pending', label: 'Pending' }].map((option) => (
                <button key={option.id} type="button" aria-pressed={paymentFilter === option.id} onClick={() => setPaymentFilter(option.id)} className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${paymentFilter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}>{option.label}</button>
              ))}
            </div>
          </div>
          <div className="surface-flat overflow-hidden">
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Transaction / receipt</th><th>Student / fee</th><th>Method</th><th>Date</th><th className="align-right">Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                <tbody>
                  {(data.payments || []).filter(matchesPayment).map((payment) => (
                    <tr key={payment.id} className={paymentParam === payment.id ? 'bg-[var(--sky-50)]' : undefined}>
                      <td>
                        <p className="font-mono text-[10.5px] font-medium text-ink">{payment.transactionId}</p>
                        <p className="mt-0.5 font-mono text-[9.5px] text-soft">{payment.receiptReference || 'No receipt'}</p>
                      </td>
                      <td><span className="text-[11px] font-medium text-ink">{payment.studentName}</span><span className="block text-[10px] text-soft">{payment.feeCode} · {payment.feeTitle}</span></td>
                      <td>{payment.methodLabel}<span className="block text-[9.5px] text-soft">{payment.source === 'admin-offline' ? 'Admin offline record' : payment.source === 'seed-history' ? 'Seeded history' : 'Student simulation'}</span></td>
                      <td className="whitespace-nowrap text-[10.5px]">{formatDateTime(payment.paidAt)}</td>
                      <td className="align-right font-medium tabular">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td><StatusCell status={payment.status} /><span className="mt-0.5 block text-[9.5px] text-soft">{PAYMENT_STATUS_LABELS[payment.status]}</span></td>
                      <td>{payment.status === 'success' ? <Button size="xs" variant="secondary" icon={Download} onClick={() => handleReceipt(payment.id)}>Receipt</Button> : <span className="text-[10px] text-soft">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data.payments || []).filter(matchesPayment).length === 0 ? <EmptyState compact icon={Receipt} title="No matching transactions" description="Try another status or search term." /> : null}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[var(--line)] bg-white p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">Failed and pending records never reduce an outstanding balance. Only successful transactions generate a receipt reference and a downloadable HTML demonstration receipt.</p>
          </div>
        </section>
      ) : null}

      {tab === 'requests' ? (
        <section className="mt-4" aria-labelledby="admin-fee-requests-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="admin-fee-requests-heading" className="display-sm text-ink">Fee requests & decisions</h2>
            <div className="flex flex-wrap gap-1">
              {[{ id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }, { id: 'resolved', label: 'Resolved' }].map((option) => (
                <button key={option.id} type="button" aria-pressed={requestFilter === option.id} onClick={() => setRequestFilter(option.id)} className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${requestFilter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}>{option.label}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            <aside className="surface-flat overflow-hidden">
              <div className="border-b border-[var(--line)] px-3.5 py-2.5"><h3 className="text-[12px] font-medium text-ink">Request queue</h3></div>
              {(data.requests || []).filter(matchesRequest).length === 0 ? <EmptyState compact icon={Inbox} title="No matching requests" description="Try another status or search term." /> : (
                <div className="max-h-[620px] space-y-1.5 overflow-y-auto p-2.5">
                  {(data.requests || []).filter(matchesRequest).map((request) => (
                    <button key={request.id} type="button" aria-pressed={selectedRequestId === request.id} onClick={() => setRequestedRequestId(request.id)} className={`w-full rounded-[10px] border px-2.5 py-2 text-left transition ${selectedRequestId === request.id ? 'border-[var(--sky-300)] bg-[var(--sky-50)]' : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'}`}>
                      <div className="flex flex-wrap items-center gap-1.5"><StatusCell status={request.status} /><span className="ml-auto font-mono text-[9px] text-soft">{request.code || request.id}</span></div>
                      <p className="mt-1 truncate text-[11.5px] font-medium text-ink">{request.subject}</p>
                      <p className="mt-0.5 text-[9.5px] text-soft">{request.studentName} · {request.typeLabel} · {request.replyCount} replies</p>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            {selectedRequest ? (
              <article className="surface-flat p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="label-xs">{selectedRequest.code || selectedRequest.id} · {selectedRequest.typeLabel}</p>
                    <h3 className="mt-1 text-[14px] font-medium text-ink">{selectedRequest.subject}</h3>
                    <p className="mt-0.5 text-[10.5px] text-soft">{selectedRequest.studentName} · {selectedRequest.feeCode} · raised {formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <StatusBadge tone={statusTone(selectedRequest.status)} dot>{FEE_REQUEST_STATUS_LABELS[selectedRequest.status] || selectedRequest.status}</StatusBadge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{selectedRequest.description}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Proposed date</p><p className="mt-0.5 text-[10.5px] text-ink">{selectedRequest.proposedDueDate ? formatDate(selectedRequest.proposedDueDate) : '—'}</p></div>
                  <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Instalments</p><p className="mt-0.5 text-[10.5px] text-ink">{selectedRequest.requestedInstalments || '—'}</p></div>
                  <div className="rounded-[9px] border border-[var(--line)] p-2"><p className="label-xs">Reviewed</p><p className="mt-0.5 text-[10.5px] text-ink">{selectedRequest.reviewedAt ? formatDate(selectedRequest.reviewedAt) : 'Awaiting decision'}</p></div>
                </div>
                {selectedRequest.decisionNote ? <div className="mt-2 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2 text-[10.5px] leading-relaxed text-[var(--sky-900)]"><span className="font-medium">Decision note:</span> {selectedRequest.decisionNote}</div> : null}

                <ol className="support-timeline mt-3">
                  {(selectedRequest.replies || []).map((reply) => (
                    <li key={reply.id} className="support-timeline-item">
                      <span className={`support-timeline-dot ${reply.kind === 'decision' ? 'is-status' : ''}`} aria-hidden="true" />
                      <div><p className="text-[10.5px] font-medium text-ink">{reply.authorName} · {formatDateTime(reply.at)} {reply.decision ? `· ${FEE_REQUEST_STATUS_LABELS[reply.decision]}` : ''}</p><p className="mt-0.5 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">{reply.body}</p></div>
                    </li>
                  ))}
                </ol>

                <form onSubmit={submitDecision} className="mt-3 space-y-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
                  <p className="text-[11px] font-medium text-ink">Admin decision with remarks</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select label="Decision" value={decisionForm.decision} onChange={(event) => setDecisionForm((current) => ({ ...current, decision: event.target.value }))}>
                      <option value="approved">Approve</option>
                      <option value="rejected">Reject</option>
                      <option value="resolved">Resolve as query</option>
                    </Select>
                    {selectedRequest.type === 'correction' && decisionForm.decision === 'approved' ? (
                      <TextInput type="number" min="0" step="0.01" label="Corrected amount (optional)" value={decisionForm.correctedAmount} onChange={(event) => setDecisionForm((current) => ({ ...current, correctedAmount: event.target.value }))} hint="Leave blank to approve as a record review only." />
                    ) : <div className="rounded-[9px] border border-[var(--line)] bg-white p-2 text-[10px] leading-snug text-soft">Approved extensions apply the proposed due date. Approved instalments schedule the existing balance; no new charge is created.</div>}
                  </div>
                  <TextArea rows={2} label="Admin remark" value={decisionForm.note} onChange={(event) => setDecisionForm((current) => ({ ...current, note: event.target.value }))} placeholder="Explain the decision to the student." required />
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[10px] text-soft">Decision, status, remark and audit event share this request ID.</span>
                    <Button size="sm" variant="primary" type="submit" icon={ArrowUpRight} loading={actionPending} disabled={!decisionForm.note.trim()}>Record decision</Button>
                  </div>
                </form>
                <div className="mt-3 flex items-end gap-2 border-t border-[var(--line)] pt-2">
                  <TextArea rows={2} value={replyDrafts[selectedRequest.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [selectedRequest.id]: event.target.value }))} placeholder="Add a response without changing the decision" aria-label="Admin response to fee request" className="flex-1" />
                  <Button size="sm" variant="secondary" icon={Send} loading={actionPending} disabled={!String(replyDrafts[selectedRequest.id] || '').trim()} onClick={() => submitReply(selectedRequest.id)}>Reply</Button>
                </div>
                <FormError>{actionError}</FormError>
              </article>
            ) : <div className="surface-flat"><EmptyState icon={MessageSquare} title="Select a fee request" description="Choose a request to review its details and record a decision." /></div>}
          </div>
        </section>
      ) : null}

      <Modal
        open={Boolean(feeModal)}
        onClose={() => setFeeModal(null)}
        title={feeModal?.mode === 'edit' ? 'Edit approved fee record' : 'Create approved fee record'}
        description="Amounts created here become the source record for Student Payment & Dues. No new amount is invented inside a page."
        footer={<div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setFeeModal(null)}>Cancel</Button><Button size="sm" variant="primary" type="submit" form="admin-fee-form" icon={FileText} loading={actionPending}>{feeModal?.mode === 'edit' ? 'Save changes' : 'Create fee'}</Button></div>}
      >
        <form id="admin-fee-form" className="space-y-3.5" onSubmit={submitFee} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Student" value={feeForm.studentId} onChange={(event) => setFeeForm((current) => ({ ...current, studentId: event.target.value }))} disabled={feeModal?.mode === 'edit'}>
              {(data.students || []).map((student) => <option key={student.id} value={student.id}>{student.name} · {student.enrollmentId || student.id}</option>)}
            </Select>
            <Select label="Category" value={feeForm.category} onChange={(event) => setFeeForm((current) => ({ ...current, category: event.target.value }))}>
              {Object.entries(FEE_CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </Select>
          </div>
          <TextInput label="Title" required value={feeForm.title} onChange={(event) => setFeeForm((current) => ({ ...current, title: event.target.value }))} placeholder="Approved fee title" />
          <TextArea label="Description" required rows={3} value={feeForm.description} onChange={(event) => setFeeForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what the charge covers." />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput type="number" min="1" step="0.01" label="Amount (INR)" required value={feeForm.amount} onChange={(event) => setFeeForm((current) => ({ ...current, amount: event.target.value }))} hint={feeModal?.mode === 'edit' ? 'Cannot be lower than the amount already paid.' : 'Authored explicitly by Admin Workspace.'} />
            <TextInput type="date" label="Due date" required value={feeForm.dueDate} onChange={(event) => setFeeForm((current) => ({ ...current, dueDate: event.target.value }))} />
          </div>
          <FormError>{actionError}</FormError>
        </form>
      </Modal>

      <Modal
        open={Boolean(offlineFee)}
        onClose={() => setOfflineFee(null)}
        title="Record offline payment"
        description="Admin office/cash/bank payment against the same fee ID. This is a local demonstration record with no real gateway or banking credentials."
        footer={<div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setOfflineFee(null)}>Cancel</Button><Button size="sm" variant="primary" type="submit" form="admin-offline-form" icon={CreditCard} loading={actionPending}>Record payment</Button></div>}
      >
        {offlineFee ? (
          <form id="admin-offline-form" className="space-y-3.5" onSubmit={submitOfflinePayment} noValidate>
            <div className="surface-sunken p-3">
              <p className="label-xs">Fee record</p>
              <p className="mt-1 text-[12.5px] font-medium text-ink">{offlineFee.title}</p>
              <p className="mt-0.5 text-[10.5px] text-soft">{offlineFee.code} · {offlineFee.studentName} · outstanding {formatCurrency(offlineFee.outstandingAmount, offlineFee.currency)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput type="number" min="1" max={offlineFee.outstandingAmount} step="0.01" label="Amount (INR)" required value={offlineForm.amount} onChange={(event) => setOfflineForm((current) => ({ ...current, amount: event.target.value }))} />
              <Select label="Method" value={offlineForm.method} onChange={(event) => setOfflineForm((current) => ({ ...current, method: event.target.value }))}>
                {PAYMENT_METHODS.filter((method) => ['bank-transfer', 'cash'].includes(method.id)).map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput type="date" label="Paid on" value={offlineForm.paidAt} onChange={(event) => setOfflineForm((current) => ({ ...current, paidAt: event.target.value }))} />
              <TextInput label="Office reference" required value={offlineForm.referenceNote} onChange={(event) => setOfflineForm((current) => ({ ...current, referenceNote: event.target.value }))} placeholder="Receipt book / office note" hint="Do not enter account numbers or card credentials." />
            </div>
            <div className="flex items-start gap-1.5 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sky-800)]" aria-hidden="true" />
              <p className="text-[10px] leading-relaxed text-[var(--sky-900)]">A successful record creates a transaction ID, receipt reference and downloadable demonstration receipt. It reduces the derived outstanding balance.</p>
            </div>
            <FormError>{actionError}</FormError>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}

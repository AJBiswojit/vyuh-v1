import { useState } from 'react'
import { AlertTriangle, Check, CheckSquare, Clock, Filter, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { relativeTime, formatDate } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const TYPE_LABEL = {
  'exam-publish': 'Examination publication',
  'attendance-correction': 'Attendance correction',
  'recording-publish': 'Recording publication',
  'support-escalation': 'Support escalation',
}

export default function AdminApprovalsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [decision, setDecision] = useState(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, error, loading, refresh, setData } = useAsync(
    () => adminService.listApprovals({ status: statusFilter, type: typeFilter }),
    [statusFilter, typeFilter],
  )

  const approvals = data || []

  const apply = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (decision.action === 'rejected' && reason.trim().length < 8) {
      setFormError('Give a short reason (at least 8 characters) so the requester understands the decision.')
      return
    }
    setSubmitting(true)
    try {
      const updated = await adminService.decideApproval(
        decision.approval.id,
        decision.action,
        reason.trim() || 'Approved as submitted',
        { id: user.id, role: 'admin', name: user.name },
      )
      setData((current) =>
        statusFilter === 'pending'
          ? (current || []).filter((item) => item.id !== updated.id)
          : (current || []).map((item) => (item.id === updated.id ? updated : item)),
      )
      toast.success(decision.action === 'approved' ? 'Request approved' : 'Request rejected', decision.approval.title)
      setDecision(null)
      setReason('')
    } catch (caught) {
      setFormError(caught?.message || 'The decision could not be recorded.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Approvals"
        description="Every decision applies to the underlying record and is written to the audit log with a reason."
      />

      <div className="surface-flat mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="tab-row border-0" role="tablist" aria-label="Approval status">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === item.id}
              className="tab"
              onClick={() => setStatusFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="field-select w-auto"
            aria-label="Filter by request type"
          >
            <option value="all">All request types</option>
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="The approval queue could not be loaded" />
      ) : approvals.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={CheckSquare}
            title={statusFilter === 'pending' ? 'No pending requests' : 'Nothing in this view'}
            description="Requests appear here when faculty publish an examination, ask for an attendance correction, or escalate support."
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {approvals.map((approval) => (
            <article key={approval.id} className="surface-flat p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(approval.status)} dot>
                      {statusLabel(approval.status)}
                    </StatusBadge>
                    <span className="badge badge-outline">{TYPE_LABEL[approval.type] || approval.type}</span>
                    {approval.priority === 'high' ? (
                      <StatusBadge tone="danger">
                        <AlertTriangle className="mr-1 inline h-2.5 w-2.5" /> High priority
                      </StatusBadge>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[10px] text-soft">
                      <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                      {relativeTime(approval.requestedAt)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[13.5px] font-medium text-ink">{approval.title}</h3>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{approval.summary}</p>
                  <p className="mt-1 text-[10.5px] text-soft">
                    Requested by {approval.requester?.name || approval.requestedBy}
                    {approval.reviewedBy ? ` · reviewed by ${approval.reviewer?.name || approval.reviewedBy} ${relativeTime(approval.reviewedAt)}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {approval.details?.length ? (
                    <dl className="text-right text-[10.5px] text-muted">
                      {approval.details.slice(0, 4).map((detail) => (
                        <div key={detail.label} className="flex justify-end gap-2">
                          <dt>{detail.label}:</dt>
                          <dd className="font-medium text-ink">{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {approval.status === 'pending' ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="xs"
                        variant="primary"
                        icon={Check}
                        onClick={() => {
                          setDecision({ approval, action: 'approved' })
                          setReason('')
                          setFormError(null)
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={X}
                        onClick={() => {
                          setDecision({ approval, action: 'rejected' })
                          setReason('')
                          setFormError(null)
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <p className="max-w-[240px] text-right text-[10.5px] text-muted">{approval.reason}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.action === 'approved' ? 'Approve this request?' : 'Reject this request?'}
        description={decision?.approval?.title}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={decision?.action === 'approved' ? 'primary' : 'danger'}
              type="submit"
              form="decision-form"
              loading={submitting}
            >
              {decision?.action === 'approved' ? 'Approve request' : 'Reject request'}
            </Button>
          </div>
        }
      >
        {decision ? (
          <form id="decision-form" onSubmit={apply} className="space-y-3">
            <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
              <p className="text-[11.5px] font-medium text-ink">{decision.approval.summary}</p>
              <p className="mt-1 text-[10.5px] text-soft">
                Requested {formatDate(decision.approval.requestedAt)} by{' '}
                {decision.approval.requester?.name || decision.approval.requestedBy}
              </p>
            </div>
            <TextArea
              label={decision.action === 'approved' ? 'Note (optional)' : 'Reason for rejection'}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder={
                decision.action === 'approved'
                  ? 'Any note you want recorded with the approval.'
                  : 'Explain what needs to change before this can be approved.'
              }
              required={decision.action === 'rejected'}
            />
            <FormError>{formError}</FormError>
            <p className="text-[10px] leading-relaxed text-soft">
              {decision.action === 'approved'
                ? 'Approving applies the change immediately: the examination becomes visible to students, or the attendance record is corrected.'
                : 'Rejecting keeps the record unchanged and notifies the requester with this reason.'}
            </p>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart3,
  Send,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import { attemptService } from '../../services/attempt.service.js'
import { formatDate, formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, Modal, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

export default function FacultyExamDetailPage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState(null)

  const { data, error, loading, refresh } = useAsync(async () => {
    const [exam, attempts] = await Promise.all([
      examService.getExam(examId),
      attemptService.listAttemptsForExam(examId),
    ])
    return { exam, attempts }
  }, [examId])

  const publish = async () => {
    const ok = await confirm({
      title: 'Publish this examination?',
      description:
        'Students in the target batches are notified. Depending on institute policy the paper may go to the administrator for approval first.',
      confirmLabel: 'Publish',
    })
    if (!ok) return
    setBusy('publish')
    try {
      const updated = await examService.publishExam(examId, { id: user.id, role: 'faculty', name: user.name })
      toast.success(
        updated.status === 'pending-approval' ? 'Sent for approval' : 'Examination published',
        updated.status === 'pending-approval'
          ? 'The administrator reviews publication requests before students see the paper.'
          : 'Students have been notified.',
      )
      refresh()
    } catch (caught) {
      toast.error('Could not publish', caught?.message)
    } finally {
      setBusy(null)
    }
  }

  const cancelExam = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (reason.trim().length < 10) {
      setFormError('Give a reason of at least 10 characters — students see it in their notification.')
      return
    }
    setBusy('cancel')
    try {
      await examService.cancelExam(examId, reason.trim(), { id: user.id, role: 'faculty', name: user.name })
      toast.info('Examination cancelled', 'Every candidate has been notified.')
      setCancelOpen(false)
      setReason('')
      refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The examination could not be cancelled.')
    } finally {
      setBusy(null)
    }
  }

  const endExam = async () => {
    const ok = await confirm({
      title: 'End this examination now?',
      description: 'In-progress attempts stay open until each candidate submits or their timer expires.',
      confirmLabel: 'End examination',
      tone: 'danger',
    })
    if (!ok) return
    setBusy('end')
    try {
      await examService.endExam(examId, 'Ended by faculty', { id: user.id, role: 'faculty', name: user.name })
      toast.success('Examination ended')
      refresh()
    } catch (caught) {
      toast.error('Could not end', caught?.message)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Examination" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Examination" backTo="/faculty/exams" backLabel="Examinations" />
        <ErrorState error={error} onRetry={refresh} title="This examination could not be loaded" />
      </div>
    )
  }

  const exam = data.exam
  const attempts = data.attempts
  const submitted = attempts.filter((attempt) => attempt.status !== 'in-progress')
  const inProgress = attempts.filter((attempt) => attempt.status === 'in-progress')
  const editable = ['draft', 'scheduled'].includes(exam.status)

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader
        eyebrow={`${exam.type} · ${formatDate(exam.startAt)}`}
        title={exam.title}
        description={exam.description}
        backTo="/faculty/exams"
        backLabel="Examinations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(exam.status)} dot>
              {statusLabel(exam.status)}
            </StatusBadge>
            {editable ? (
              <>
                <Link to={`/faculty/exams/${exam.id}/edit`} className="btn btn-secondary btn-sm">
                  Edit paper
                </Link>
                <Button size="sm" variant="primary" icon={Send} loading={busy === 'publish'} onClick={publish}>
                  Publish
                </Button>
              </>
            ) : null}
            {exam.status === 'published' ? (
              <Button size="sm" variant="secondary" onClick={endExam} loading={busy === 'end'}>
                End examination
              </Button>
            ) : null}
            {['published', 'completed'].includes(exam.status) ? (
              <Link to={`/faculty/item-analysis?examId=${exam.id}`} className="btn btn-ghost btn-sm">
                <BarChart3 className="h-3.5 w-3.5" /> Item analysis
              </Link>
            ) : null}
            {['draft', 'scheduled', 'published'].includes(exam.status) ? (
              <Button size="sm" variant="ghost" icon={Ban} onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            ) : null}
          </div>
        }
      />

      {exam.status === 'cancelled' ? (
        <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[#e8c9c9] bg-[#fdf6f6] p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7d2b2b]" aria-hidden="true" />
          <p className="text-[11.5px] leading-relaxed text-[#7d2b2b]">
            This examination was cancelled. {exam.cancellationReason || 'The reason was recorded in the audit log.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 lg:col-span-8">
          <h2 className="text-[13px] font-medium text-ink">Paper structure</h2>
          <div className="mt-2 space-y-2">
            {(exam.sections || []).map((section) => (
              <div key={section.id} className="rounded-[10px] border border-[var(--line)] p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-ink">{section.name}</p>
                  <span className="text-[10.5px] text-soft">
                    {section.questionIds.length} questions
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-snug text-muted">{section.instructions}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Questions', value: exam.totalQuestions },
              { label: 'Total marks', value: exam.totalMarks },
              { label: 'Duration', value: `${exam.durationMinutes}m` },
              { label: 'Attempts', value: attempts.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                <p className="label-xs">{stat.label}</p>
                <p className="mt-0.5 text-[13px] font-medium tabular text-ink">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-flat p-4 lg:col-span-4">
          <h2 className="text-[13px] font-medium text-ink">Window and policy</h2>
          <dl className="mt-2 space-y-1.5 text-[11.5px]">
            <div className="flex justify-between gap-2"><dt className="text-muted">Opens</dt><dd className="text-right font-medium text-ink">{formatDate(exam.startAt)} · {formatTime(exam.startAt)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Closes</dt><dd className="text-right font-medium text-ink">{formatDate(exam.endAt)} · {formatTime(exam.endAt)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Negative marking</dt><dd className="text-right font-medium text-ink">{exam.negativeMarking ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Shuffle questions</dt><dd className="text-right font-medium text-ink">{exam.shuffleQuestions ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Late join</dt><dd className="text-right font-medium text-ink">{exam.allowLateJoin ? 'Within window' : 'No'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Result</dt><dd className="text-right font-medium text-ink capitalize">{String(exam.resultVisibility).replace('-', ' ')}</dd></div>
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-soft">
            Batches: {(exam.batches || []).map((batch) => batch.name).join(', ') || '—'}
          </p>
        </section>
      </div>

      <section className="surface-flat mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
          <h2 className="text-[13px] font-medium text-ink">Candidates</h2>
          <p className="text-[10.5px] text-soft">
            {submitted.length} submitted · {inProgress.length} in progress
          </p>
        </div>
        {attempts.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="No attempts yet"
            description="Once the window opens and a candidate starts, their progress appears here."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Submitted</th>
                  <th className="align-right">Answered</th>
                  <th className="align-right">Time left</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="font-medium text-ink">{attempt.studentId}</td>
                    <td>
                      <StatusBadge tone={statusTone(attempt.status)} dot>
                        {statusLabel(attempt.status)}
                      </StatusBadge>
                    </td>
                    <td className="text-[11px]">{attempt.startedAt ? relativeTime(attempt.startedAt) : '—'}</td>
                    <td className="text-[11px]">{attempt.submittedAt ? relativeTime(attempt.submittedAt) : '—'}</td>
                    <td className="align-right tabular">
                      {attempt.responses?.filter((response) => response.answer !== null).length ?? 0}/{attempt.responses?.length ?? 0}
                    </td>
                    <td className="align-right tabular">
                      {attempt.status === 'in-progress' ? `${Math.round((attempt.remainingTime || 0) / 60)}m` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {submitted.length ? (
        <section className="surface-flat mt-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-medium text-ink">Score snapshot</h2>
            <Link to={`/faculty/item-analysis?examId=${exam.id}`} className="text-[11px] font-medium text-link">
              Full analysis <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={Math.round((submitted.length / Math.max(1, attempts.length)) * 100)}
              label="Submission rate"
              tone="sky"
            />
            <p className="mt-1 text-[10.5px] text-soft">
              {submitted.length} of {attempts.length} candidates have submitted. Marks are computed per question from the
              marking scheme, and negative marks apply only where the paper allows them.
            </p>
          </div>
        </section>
      ) : null}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this examination"
        description="Candidates are notified with your reason. Cancellation cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep examination
            </Button>
            <Button size="sm" variant="danger" type="submit" form="cancel-exam" loading={busy === 'cancel'}>
              Cancel examination
            </Button>
          </div>
        }
      >
        <form id="cancel-exam" onSubmit={cancelExam} className="space-y-3">
          <TextArea
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="e.g. The question paper contains a printing error in Section B."
            required
          />
          <FormError>{formError}</FormError>
        </form>
      </Modal>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  PlayCircle,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { examService } from '../../services/exam.service.js'
import { formatDate, formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, TextInput, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

const CONTROL_LABEL = {
  pause: 'Pause examination',
  resume: 'Resume examination',
  extend: 'Extend time',
  'force-submit': 'Force submit attempts',
  end: 'End examination',
}

export default function AdminIntegrityPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeExamId = searchParams.get('examId')
  const [resolvedFilter, setResolvedFilter] = useState('open')
  const [resolveFor, setResolveFor] = useState(null)
  const [resolution, setResolution] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [controlOpen, setControlOpen] = useState(null)
  const [extendMinutes, setExtendMinutes] = useState('10')
  const [controlNote, setControlNote] = useState('')
  const [controlError, setControlError] = useState(null)
  const [targetAttemptId, setTargetAttemptId] = useState('')

  const events = useAsync(
    () => adminService.listIntegrity(resolvedFilter === 'all' ? {} : { resolved: resolvedFilter === 'resolved' }),
    [resolvedFilter],
  )
  const examDetail = useAsync(
    () => (activeExamId ? adminService.getIntegrityExamDetail(activeExamId) : Promise.resolve(null)),
    [activeExamId],
  )
  const liveExams = useAsync(() => examService.listExams({ status: 'published' }), [])

  const exams = liveExams.data || []
  const openEvents = useMemo(
    () => (events.data || []).filter((event) => (resolvedFilter === 'resolved' ? event.resolved : resolvedFilter === 'open' ? !event.resolved : true)),
    [events.data, resolvedFilter],
  )

  const saveResolution = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (resolution.trim().length < 5) {
      setFormError('Record how the event was resolved (at least 5 characters).')
      return
    }
    setSubmitting(true)
    try {
      await adminService.resolveIntegrity(resolveFor.id, resolution.trim(), { id: user.id, role: 'admin', name: user.name })
      toast.success('Integrity event resolved', 'The resolution is stored with your name and the timestamp.')
      setResolveFor(null)
      setResolution('')
      events.refresh()
      if (activeExamId) examDetail.refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The resolution could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  const runControl = async (event) => {
    event.preventDefault()
    setControlError(null)
    const action = controlOpen
    try {
      if (action === 'extend' && !(Number(extendMinutes) > 0)) {
        setControlError('Enter a number of minutes greater than zero.')
        return
      }
      if (action === 'force-submit' && !targetAttemptId) {
        setControlError('Choose the in-progress attempt to force-submit.')
        return
      }
      const payload = {
        reason: controlNote.trim() || CONTROL_LABEL[action],
        ...(action === 'extend' ? { minutes: Number(extendMinutes) } : {}),
        ...(action === 'force-submit' ? { attemptId: targetAttemptId } : {}),
      }
      const ok = await confirm({
        title: `${CONTROL_LABEL[action]}?`,
        description:
          action === 'force-submit'
            ? 'Every in-progress attempt for this paper is submitted immediately with the responses saved so far.'
            : action === 'end'
              ? 'The examination window closes. Candidates who have not started cannot start.'
              : 'This action is recorded in the audit log and visible to candidates on their examination screen.',
        confirmLabel: CONTROL_LABEL[action],
        tone: ['force-submit', 'end'].includes(action) ? 'danger' : 'normal',
      })
      if (!ok) return
      setSubmitting(true)
      await adminService.examControl(activeExamId, action, payload, { id: user.id, role: 'admin', name: user.name })
      toast.success('Control applied', CONTROL_LABEL[action])
      setControlOpen(null)
      setControlNote('')
      setTargetAttemptId('')
      examDetail.refresh()
      events.refresh()
    } catch (caught) {
      setControlError(caught?.message || 'The control could not be applied.')
    } finally {
      setSubmitting(false)
    }
  }

  if (events.loading && !events.data) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Integrity" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Integrity"
        description="Focus loss, reconnections and late joins are recorded as observations. Technical interruptions are never treated as misconduct on their own."
        actions={
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => {
            events.refresh()
            examDetail.refresh()
          }}>
            Refresh
          </Button>
        }
      />

      <div className="surface-flat mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="integrity-exam" className="label-xs">
            Examination
          </label>
          <select
            id="integrity-exam"
            value={activeExamId || ''}
            onChange={(event) => setSearchParams(event.target.value ? { examId: event.target.value } : {})}
            className="field-select w-auto"
          >
            <option value="">All examinations (event log)</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>
          {activeExamId ? (
            <Button size="xs" variant="ghost" onClick={() => setSearchParams({})}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {!activeExamId ? (
        <>
          <div className="tab-row mb-3" role="tablist" aria-label="Integrity event status">
            {[
              { id: 'open', label: 'Unresolved' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'all', label: 'All' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={resolvedFilter === item.id}
                className="tab"
                onClick={() => setResolvedFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {events.error ? (
            <ErrorState error={events.error} onRetry={events.refresh} title="Integrity events could not be loaded" />
          ) : openEvents.length === 0 ? (
            <div className="surface-flat">
              <EmptyState
                icon={ShieldCheck}
                title="Nothing to review"
                description="Integrity observations appear here when a candidate loses focus, reconnects or joins late."
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {openEvents.map((event) => (
                <article key={event.id} className="surface-flat p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={event.resolved ? 'good' : event.severity === 'warning' ? 'warn' : 'sky'} dot>
                          {event.resolved ? 'Resolved' : event.severity === 'warning' ? 'Observation' : 'Informational'}
                        </StatusBadge>
                        <span className="badge badge-outline">{String(event.type).replace('-', ' ')}</span>
                        <span className="text-[10px] text-soft">{relativeTime(event.at)}</span>
                      </div>
                      <h3 className="mt-1.5 text-[13px] font-medium text-ink">{event.label}</h3>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{event.detail}</p>
                      <p className="mt-1 text-[10.5px] text-soft">
                        {event.studentName} · {event.examTitle || 'Live class'} · attempt {event.attemptId}
                      </p>
                      {event.resolved ? (
                        <p className="mt-1.5 rounded-[8px] bg-[#f4f9f2] px-2.5 py-1.5 text-[10.5px] text-[#375f34]">
                          Resolution: {event.resolution}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {event.examId ? (
                        <Button size="xs" variant="secondary" icon={Eye} onClick={() => setSearchParams({ examId: event.examId })}>
                          Live monitor
                        </Button>
                      ) : null}
                      {!event.resolved ? (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => {
                            setResolveFor(event)
                            setResolution('')
                            setFormError(null)
                          }}
                        >
                          Record resolution
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : examDetail.loading ? (
        <LoadingBlock rows={5} />
      ) : examDetail.error ? (
        <ErrorState error={examDetail.error} onRetry={examDetail.refresh} title="The live monitor could not be loaded" />
      ) : examDetail.data ? (
        <>
          <div className="surface-flat p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(examDetail.data.exam.status)} dot>
                    {statusLabel(examDetail.data.exam.status)}
                  </StatusBadge>
                  <span className="badge badge-outline">{examDetail.data.exam.durationMinutes} min</span>
                  <span className="badge badge-outline">
                    <Clock className="mr-1 inline h-2.5 w-2.5" />
                    closes {formatTime(examDetail.data.exam.endAt)}
                  </span>
                </div>
                <h2 className="mt-1.5 text-[15px] font-medium text-ink">{examDetail.data.exam.title}</h2>
                <p className="text-[11px] text-muted">
                  {formatDate(examDetail.data.exam.startAt)} · {examDetail.data.candidates.length} candidates in scope
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Active', value: examDetail.data.summary.active },
                  { label: 'Submitted', value: examDetail.data.summary.submitted },
                  { label: 'Not started', value: examDetail.data.summary.notStarted },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2 text-center">
                    <p className="label-xs">{stat.label}</p>
                    <p className="mt-0.5 text-[15px] font-medium tabular text-ink">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['pause', 'resume', 'extend', 'force-submit', 'end'].map((action) => (
                <Button
                  key={action}
                  size="xs"
                  variant={['force-submit', 'end'].includes(action) ? 'secondary' : 'ghost'}
                  icon={action === 'extend' ? Timer : action === 'force-submit' ? Ban : action === 'end' ? Shield : PlayCircle}
                  onClick={() => {
                    setControlOpen(action)
                    setControlNote('')
                    setControlError(null)
                    setTargetAttemptId('')
                  }}
                >
                  {CONTROL_LABEL[action]}
                </Button>
              ))}
            </div>
          </div>

          {examDetail.data.controls.length ? (
            <section className="surface-flat mt-3 p-4">
              <h3 className="text-[12.5px] font-medium text-ink">Control history</h3>
              <ul className="mt-1.5 space-y-1">
                {examDetail.data.controls.map((control) => (
                  <li key={control.id} className="text-[11px] text-muted">
                    <span className="font-medium text-ink">{CONTROL_LABEL[control.action] || control.action}</span> ·{' '}
                    {relativeTime(control.at)} {control.note ? `· ${control.note}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="surface-flat mt-3 overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-2.5">
              <h3 className="text-[12.5px] font-medium text-ink">Candidate monitor</h3>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Status</th>
                    <th className="align-right">Answered</th>
                    <th className="align-right">Time left</th>
                    <th>Connection</th>
                    <th className="align-right">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {examDetail.data.candidates.map((candidate) => (
                    <tr key={candidate.studentId}>
                      <td className="font-medium text-ink">{candidate.name}</td>
                      <td>
                        <StatusBadge tone={statusTone(candidate.status)} dot>
                          {statusLabel(candidate.status)}
                        </StatusBadge>
                      </td>
                      <td className="align-right tabular">
                        {candidate.answered}/{candidate.total}
                      </td>
                      <td className="align-right tabular">
                        {candidate.status === 'in-progress' && candidate.remainingTime !== null
                          ? `${Math.floor(candidate.remainingTime / 60)}m ${candidate.remainingTime % 60}s`
                          : '—'}
                      </td>
                      <td className="text-[11px] text-muted">{candidate.connection}</td>
                      <td className="align-right tabular">{candidate.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-flat mt-3 p-4">
            <h3 className="text-[12.5px] font-medium text-ink">Events for this examination</h3>
            {examDetail.data.events.length === 0 ? (
              <p className="mt-1 text-[11px] text-soft">No integrity event has been recorded for this paper.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {examDetail.data.events.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-ink">{event.label}</p>
                      <p className="text-[10px] text-soft">
                        {relativeTime(event.at)} · {event.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={event.resolved ? 'good' : 'warn'}>{event.resolved ? 'Resolved' : 'Open'}</StatusBadge>
                      {!event.resolved ? (
                        <button
                          type="button"
                          onClick={() => {
                            setResolveFor(event)
                            setResolution('')
                            setFormError(null)
                          }}
                          className="text-[10.5px] font-medium text-link"
                        >
                          Resolve
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">
              A reconnection or focus loss is an observation, not a verdict. Resolve each event with what actually happened;
              control actions and resolutions both reach the audit log.
            </p>
          </div>
        </>
      ) : null}

      <Modal
        open={Boolean(resolveFor)}
        onClose={() => setResolveFor(null)}
        title="Record a resolution"
        description={resolveFor?.label}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setResolveFor(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="resolve-form" loading={submitting}>
              Save resolution
            </Button>
          </div>
        }
      >
        <form id="resolve-form" onSubmit={saveResolution} className="space-y-3">
          <TextArea
            label="What happened?"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            rows={4}
            placeholder="e.g. Verified as a home-network interruption with the candidate. Timer continued, no action taken."
            required
          />
          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <Modal
        open={Boolean(controlOpen)}
        onClose={() => setControlOpen(null)}
        title={controlOpen ? CONTROL_LABEL[controlOpen] : 'Examination control'}
        description="Controls apply to every in-progress attempt for this paper and are audited."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setControlOpen(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="control-form" loading={submitting}>
              Apply control
            </Button>
          </div>
        }
      >
        <form id="control-form" onSubmit={runControl} className="space-y-3">
          {controlOpen === 'extend' ? (
            <TextInput
              label="Additional minutes"
              type="number"
              min="1"
              max="30"
              value={extendMinutes}
              onChange={(event) => setExtendMinutes(event.target.value)}
              hint="Between 1 and 30 minutes, applied to every in-progress attempt."
              required
            />
          ) : null}
          {controlOpen === 'force-submit' ? (
            <label className="block">
              <span className="label-xs">Attempt to submit</span>
              <select
                value={targetAttemptId}
                onChange={(event) => setTargetAttemptId(event.target.value)}
                className="field-select mt-1"
                required
              >
                <option value="">Choose a candidate…</option>
                {(examDetail.data?.candidates || [])
                  .filter((candidate) => candidate.status === 'in-progress' && candidate.attemptId)
                  .map((candidate) => (
                    <option key={candidate.attemptId} value={candidate.attemptId}>
                      {candidate.name} · {candidate.answered}/{candidate.total} answered
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <TextArea
            label="Note for the audit log"
            value={controlNote}
            onChange={(event) => setControlNote(event.target.value)}
            rows={3}
            placeholder="Why is this control being applied?"
          />
          <FormError>{controlError}</FormError>
          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-soft">
            <Plus className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            Extending adds time to every in-progress attempt. Pausing blocks new answers until resumed.
          </p>
        </form>
      </Modal>
    </div>
  )
}

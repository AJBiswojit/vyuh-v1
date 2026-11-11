import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CalendarPlus,
  Download,
  Info,
  MonitorPlay,
  Radio,
  RefreshCw,
  Video,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import { batchService } from '../../services/batch.service.js'
import { attendanceService } from '../../services/attendance.service.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { formatDate, formatTime, relativeTime, toDateTimeLocalValue, fromDateTimeLocalValue } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Checkbox, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'
import FacultyClassStudioPage from './FacultyClassStudioPage.jsx'

const TABS = [
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'recent', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function scheduleDefaults() {
  const start = new Date(Date.now() + 24 * 3600 * 1000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 90 * 60000)
  return {
    startAt: toDateTimeLocalValue(start.toISOString()),
    endAt: toDateTimeLocalValue(end.toISOString()),
  }
}

export default function FacultyClassesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const { classId: studioParam } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('live')
  /* Deep links such as /faculty/classes/class_001/studio open the studio
     directly; leaving the studio returns to the list so the URL stays honest. */
  /* The URL is the single source of truth for which studio is open, so a
     refresh, the back button and a pasted deep link all land in the same place
     and the two can never disagree. */
  const studioId = studioParam || null
  const setStudioId = (id) => navigate(id ? `/faculty/classes/${id}/studio` : '/faculty/classes')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    batchId: '',
    subjectId: SUBJECTS[0].id,
    ...scheduleDefaults(),
    lateJoinAllowed: true,
    recordingEnabled: true,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data, error, loading, refresh, setData } = useAsync(async () => {
    const [classes, batches] = await Promise.all([
      liveClassService.getFacultyClassOverview(user.id),
      batchService.listBatches({ status: 'active' }),
    ])
    return { classes, batches }
  }, [user.id])

  const openCreate = () => {
    const mine = data?.batches?.[0]
    setForm((current) => ({
      ...current,
      batchId: current.batchId || mine?.id || '',
      ...scheduleDefaults(),
    }))
    setCreateOpen(true)
    setErrors({})
    setFormError(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      title: [rules.required('Session title'), rules.minLength(6, 'Session title')],
      batchId: [rules.required('Batch')],
      startAt: [rules.required('Start time')],
      endAt: [rules.required('End time'), rules.dateAfter('startAt', 'The session must end after it starts.')],
    })
    setErrors(validationErrors)
    if (!valid) return
    setSaving(true)
    try {
      const created = await liveClassService.createClass(
        {
          title: form.title.trim(),
          description: form.description.trim() || 'Live session for the batch.',
          batchId: form.batchId,
          subjectId: form.subjectId,
          startAt: fromDateTimeLocalValue(form.startAt),
          endAt: fromDateTimeLocalValue(form.endAt),
          lateJoinAllowed: form.lateJoinAllowed,
          recordingEnabled: form.recordingEnabled,
        },
        { id: user.id, role: 'faculty', name: user.name },
      )
      setData((current) => ({
        ...current,
        classes: {
          ...current.classes,
          upcoming: [...current.classes.upcoming, created].sort(
            (a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt),
          ),
        },
      }))
      setCreateOpen(false)
      setTab('upcoming')
      toast.success('Session scheduled', 'Students in the batch have been notified.')
    } catch (caught) {
      setFormError(caught?.message || 'The session could not be scheduled.')
    } finally {
      setSaving(false)
    }
  }

  const startNow = async (klass) => {
    try {
      await liveClassService.startSession(klass.id, { id: user.id, role: 'faculty', name: user.name })
      toast.success('Session started', 'Students can join the classroom now.')
      refresh()
      setStudioId(klass.id)
    } catch (caught) {
      toast.error('Session could not start', caught?.message)
    }
  }

  const exportAttendance = async (klass) => {
    try {
      const file = await attendanceService.exportClassAttendance(klass.id)
      const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
      toast.success('Register exported', file.filename)
    } catch (caught) {
      toast.error('Export unavailable', caught?.message)
    }
  }

  if (studioId) {
    return (
      <div className="-m-3 sm:-m-5">
        {loading && !data ? (
          /* Deep link straight into a studio: show the loading shell rather than
             a studio with no session behind it. */
          <div className="p-6">
            <LoadingBlock rows={5} label="Opening the classroom" />
          </div>
        ) : error && !data ? (
          <div className="p-6">
            <ErrorState error={error} onRetry={refresh} title="The classroom could not be opened" />
          </div>
        ) : (
        <FacultyClassStudioPage
          classId={studioId}
          embedded
          onExit={() => {
            setStudioId(null)
            refresh()
          }}
        />
        )}
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Classes" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Classes" />
        <ErrorState error={error} onRetry={refresh} title="Your classes could not be loaded" />
      </div>
    )
  }

  const classes = data.classes
  const counts = {
    live: classes.live.length,
    upcoming: classes.upcoming.length,
    recent: classes.recent.length,
    cancelled: classes.cancelled.length,
  }
  const visible = classes[tab] || []

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Classes"
        description="Schedule a session, run it from the studio, and the attendance and recording records follow automatically."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button size="sm" variant="primary" icon={CalendarPlus} onClick={openCreate}>
              Schedule session
            </Button>
          </div>
        }
      />

      {createOpen ? (
        <section className="surface mb-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-medium text-ink">Schedule a live session</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">
                Every session creates an attendance window and, if enabled, a recording placeholder.
              </p>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setCreateOpen(false)}>
              Close
            </Button>
          </div>
          <form onSubmit={submit} className="mt-3 space-y-3.5" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Session title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                error={errors.title}
                placeholder="e.g. Rotational dynamics — problem clinic"
                required
              />
              <Select
                label="Batch"
                value={form.batchId}
                onChange={(event) => setForm((current) => ({ ...current, batchId: event.target.value }))}
                error={errors.batchId}
                required
              >
                <option value="">Select a batch</option>
                {data.batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} · {batch.section}
                  </option>
                ))}
              </Select>
              <Select
                label="Subject"
                value={form.subjectId}
                onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
                required
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
              <TextInput
                label="Start"
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
                error={errors.startAt}
                required
              />
              <TextInput
                label="End"
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
                error={errors.endAt}
                required
              />
            </div>
            <TextArea
              label="Session brief"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={2}
              hint="Shown to students on their class card."
            />
            <div className="flex flex-wrap gap-4">
              <Checkbox
                label="Late joining allowed"
                checked={form.lateJoinAllowed}
                onChange={(event) => setForm((current) => ({ ...current, lateJoinAllowed: event.target.checked }))}
                description="Within the institute policy window."
              />
              <Checkbox
                label="Record this session"
                checked={form.recordingEnabled}
                onChange={(event) => setForm((current) => ({ ...current, recordingEnabled: event.target.checked }))}
                description="A recording is queued when the session ends."
              />
            </div>
            <FormError>{formError}</FormError>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Schedule session
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="tab-row mb-4" role="tablist" aria-label="Class groups">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className="tab"
            onClick={() => setTab(item.id)}
          >
            {item.label} <span className="ml-1.5 text-[10.5px] text-soft">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={Video}
            title={tab === 'live' ? 'Nothing live right now' : tab === 'upcoming' ? 'No upcoming sessions' : `No ${tab} sessions`}
            description={
              tab === 'live'
                ? 'Start a scheduled session and it appears here with the studio entry point.'
                : 'Schedule a session for your batch and it will be listed here.'
            }
            action={
              <Button size="sm" variant="primary" icon={CalendarPlus} onClick={openCreate}>
                Schedule session
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((klass) => {
            const isLive = klass.status === 'live'
            const isDone = ['ended', 'recording-processing', 'recording-published'].includes(klass.status)
            return (
              <article key={klass.id} className="surface-flat p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={isLive ? 'danger' : statusTone(klass.status)} dot={isLive}>
                        {isLive ? 'Live' : statusLabel(klass.status)}
                      </StatusBadge>
                      <span className="badge badge-sky">{klass.subject?.name}</span>
                      <span className="badge badge-outline">{klass.batch?.name}</span>
                      <span className="badge badge-outline">{klass.durationMinutes} min</span>
                      {klass.recordingEnabled ? <span className="badge badge-outline">Recording on</span> : null}
                    </div>
                    <h3 className="mt-1.5 text-[13.5px] font-medium text-ink">{klass.title}</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{klass.description}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-soft">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" aria-hidden="true" />
                        {formatDate(klass.scheduledStartAt)} · {formatTime(klass.scheduledStartAt)} – {formatTime(klass.scheduledEndAt)}
                      </span>
                      <span>{klass.participantCount} enrolled</span>
                      {isLive ? <span>started {relativeTime(klass.sessionStartedAt)}</span> : null}
                      {klass.attendanceRecords?.length ? (
                        <span>{klass.attendanceRecords.length} attendance records</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {isLive ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Radio}
                        onClick={() => setStudioId(klass.id)}
                      >
                        Enter studio
                      </Button>
                    ) : klass.status === 'scheduled' ? (
                      <Button size="sm" variant="primary" icon={MonitorPlay} onClick={() => startNow(klass)}>
                        Start session
                      </Button>
                    ) : null}
                    {isDone ? (
                      <>
                        <Link to={`/faculty/attendance?classId=${klass.id}`} className="btn btn-secondary btn-sm">
                          Attendance
                        </Link>
                        <Button size="sm" variant="ghost" icon={Download} onClick={() => exportAttendance(klass)}>
                          CSV
                        </Button>
                      </>
                    ) : null}
                    {klass.recordingId ? (
                      <Link to="/faculty/recordings" className="btn btn-ghost btn-sm">
                        Recording
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          The studio uses real local camera and screen-share APIs, but there is no media server in this phase: students see
          a simulated stage alongside real attendance events. Starting a session marks it live for the batch; ending it
          finalises attendance from the recorded join/leave times.
        </p>
      </div>
    </div>
  )
}

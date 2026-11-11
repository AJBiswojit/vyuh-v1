import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck, Download, Info, Search, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { attendanceService } from '../../services/attendance.service.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { formatDate, formatMinutes, formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

export default function FacultyAttendancePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeClassId = searchParams.get('classId')
  const [search, setSearch] = useState('')
  const [correctionFor, setCorrectionFor] = useState(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { data, error, loading, refresh } = useAsync(() => attendanceService.getFacultyAttendance(user.id), [user.id])
  const detail = useAsync(
    () => (activeClassId ? attendanceService.getClassAttendance(activeClassId) : Promise.resolve(null)),
    [activeClassId],
  )

  const sessions = data || []
  const activeSession = useMemo(() => sessions.find((session) => session.klass.id === activeClassId) || null, [sessions, activeClassId])

  const filteredRecords = useMemo(() => {
    const rows = detail.data?.records || activeSession?.records || []
    const needle = search.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((record) => record.name.toLowerCase().includes(needle))
  }, [detail.data, activeSession, search])

  const requestCorrection = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (reason.trim().length < 12) {
      setFormError('Explain the correction in at least 12 characters so the administrator can review it.')
      return
    }
    setSubmitting(true)
    try {
      await attendanceService.requestCorrection(
        correctionFor.classId,
        correctionFor.studentId,
        reason.trim(),
        { id: user.id, role: 'faculty', name: user.name },
      )
      toast.success('Correction requested', 'The administrator will review this record before it changes.')
      setCorrectionFor(null)
      setReason('')
      detail.refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The correction could not be requested.')
    } finally {
      setSubmitting(false)
    }
  }

  const exportRegister = async () => {
    if (!activeClassId) return
    setExporting(true)
    try {
      const file = await attendanceService.exportClassAttendance(activeClassId)
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
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Attendance" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Attendance" />
        <ErrorState error={error} onRetry={refresh} title="Attendance could not be loaded" />
      </div>
    )
  }

  /* No data and no error can happen when the request resolved to null; treat it
     as a failure rather than rendering an attendance register of zeros. */
  if (!data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Attendance" />
        <ErrorState
          error={{ message: 'The attendance register is unavailable right now.' }}
          onRetry={refresh}
          title="Attendance could not be loaded"
        />
      </div>
    )
  }

  const totals = sessions.reduce(
    (accumulator, session) => {
      accumulator.records += session.records.length
      accumulator.present += session.records.filter((record) => record.status === 'present').length
      accumulator.partial += session.records.filter((record) => record.status === 'partial').length
      accumulator.absent += session.records.filter((record) => record.status === 'absent').length
      return accumulator
    },
    { records: 0, present: 0, partial: 0, absent: 0 },
  )

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Attendance"
        description="Duration-based attendance for every session you have taught. Reconnects are merged into a single interval."
        actions={
          activeClassId ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSearchParams({})}>
                All sessions
              </Button>
              <Button size="sm" variant="primary" icon={Download} loading={exporting} onClick={exportRegister}>
                Export CSV
              </Button>
            </div>
          ) : null
        }
      />

      {sessions.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={CalendarCheck}
            title="No sessions to report"
            description="Once you complete a live session, its attendance register appears here automatically."
          />
        </div>
      ) : !activeClassId ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Sessions', value: sessions.length, hint: 'Live or completed' },
              { label: 'Attendance records', value: totals.records, hint: 'Student × session' },
              { label: 'Present', value: totals.present, hint: 'At or above threshold' },
              { label: 'Below threshold', value: totals.partial + totals.absent, hint: 'Partial or absent' },
            ].map((stat) => (
              <div key={stat.label} className="surface-flat p-4">
                <p className="label-xs">{stat.label}</p>
                <p className="stat-figure mt-1.5 text-ink">{stat.value}</p>
                <p className="mt-1 text-[10.5px] text-soft">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="surface-flat mt-4 overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-2.5">
              <h2 className="text-[13px] font-medium text-ink">Session registers</h2>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Date</th>
                    <th className="align-right">Present</th>
                    <th className="align-right">Partial</th>
                    <th className="align-right">Avg. attendance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isLive = session.klass.status === 'live'
                    return (
                      <tr key={session.klass.id}>
                        <td>
                          <p className="font-medium text-ink">{session.klass.title}</p>
                          <p className="text-[10.5px] text-soft">
                            {session.batch?.name} · {subjectName(session.klass.subjectId)}
                            {isLive ? ' · live now' : ''}
                          </p>
                        </td>
                        <td className="whitespace-nowrap">
                          {formatDate(session.klass.scheduledStartAt)}
                          <span className="block text-[10px] text-soft">{formatTime(session.klass.scheduledStartAt)}</span>
                        </td>
                        <td className="align-right tabular">{session.summary.presentCount}</td>
                        <td className="align-right tabular">{session.summary.partialCount}</td>
                        <td className="align-right tabular font-medium">{session.summary.attendancePercentage}%</td>
                        <td className="align-right">
                          <button
                            type="button"
                            onClick={() => setSearchParams({ classId: session.klass.id })}
                            className="text-[11px] font-medium text-link"
                          >
                            Open register
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : detail.loading ? (
        <LoadingBlock rows={5} />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refresh} title="This register could not be loaded" />
      ) : detail.data ? (
        <>
          <div className="surface-flat p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(detail.data.klass.status)} dot>
                    {statusLabel(detail.data.klass.status)}
                  </StatusBadge>
                  <span className="badge badge-outline">{detail.data.batch?.name}</span>
                  <span className="badge badge-outline">{subjectName(detail.data.klass.subjectId)}</span>
                </div>
                <h2 className="mt-1.5 text-[15px] font-medium text-ink">{detail.data.klass.title}</h2>
                <p className="text-[11px] text-muted">
                  {formatDate(detail.data.klass.scheduledStartAt)} · {formatTime(detail.data.klass.scheduledStartAt)} –{' '}
                  {formatTime(detail.data.klass.scheduledEndAt)} · session {detail.data.klass.sessionId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="label-xs">Average</p>
                  <p className="stat-figure text-[22px] text-ink">{detail.data.summary.attendancePercentage}%</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Enrolled', value: detail.data.records.length },
                { label: 'Present', value: detail.data.summary.presentCount },
                { label: 'Partial', value: detail.data.summary.partialCount },
                { label: 'Absent', value: detail.data.summary.absentCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2">
                  <p className="label-xs">{stat.label}</p>
                  <p className="mt-0.5 text-[14px] font-medium tabular text-ink">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-flat mt-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
              <h3 className="text-[13px] font-medium text-ink">Register</h3>
              <div className="relative w-[220px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="field-input pl-8"
                  placeholder="Search students…"
                  aria-label="Search students"
                />
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[11.5px] text-soft">No student matches this search.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th className="align-right">Attended</th>
                      <th className="align-right">Eligible</th>
                      <th className="align-right">Percent</th>
                      <th>Status</th>
                      <th>Intervals</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.studentId}>
                        <td>
                          <p className="font-medium text-ink">{record.name}</p>
                          <p className="text-[10.5px] text-soft">{record.email || record.studentId}</p>
                        </td>
                        <td className="align-right tabular">{formatMinutes(record.attendedDuration)}</td>
                        <td className="align-right tabular">{formatMinutes(record.eligibleDuration)}</td>
                        <td className="align-right tabular font-medium">{record.attendancePercentage}%</td>
                        <td>
                          <StatusBadge tone={statusTone(record.status)} dot>
                            {statusLabel(record.status)}
                          </StatusBadge>
                          {record.correctionRequested ? (
                            <span className="mt-0.5 block text-[9.5px] text-[#8a6d1f]">Correction pending</span>
                          ) : null}
                        </td>
                        <td className="text-[10.5px] text-soft">
                          {record.intervals?.length
                            ? record.intervals
                                .map((interval) => `${formatTime(interval.from)}–${formatTime(interval.to)}`)
                                .join(', ')
                            : 'No join recorded'}
                          {record.reconnectionEvents?.length ? (
                            <span className="block">{record.reconnectionEvents.length} reconnect(s)</span>
                          ) : null}
                        </td>
                        <td className="align-right">
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionFor({ ...record, classId: detail.data.klass.id })
                              setReason('')
                              setFormError(null)
                            }}
                            disabled={record.correctionRequested}
                            className="text-[10.5px] font-medium text-link disabled:text-soft disabled:no-underline"
                          >
                            Request correction
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {detail.data.corrections?.length ? (
            <div className="surface-flat mt-3 p-3.5">
              <p className="text-[12px] font-medium text-ink">Corrections in review</p>
              <ul className="mt-1.5 space-y-1">
                {detail.data.corrections.map((correction) => (
                  <li key={correction.id} className="text-[11px] text-muted">
                    {correction.studentId} · requested {relativeTime(correction.correctionRequestedAt || correction.updatedAt || new Date().toISOString())} ·{' '}
                    {correction.correctionReason || 'Awaiting administrator review'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">
              Corrections never edit attendance silently. A request goes to the administrator; only an approved request
              rewrites the join/leave events, and the change is recorded in the audit log.
            </p>
          </div>
        </>
      ) : null}

      <Modal
        open={Boolean(correctionFor)}
        onClose={() => setCorrectionFor(null)}
        title="Request an attendance correction"
        description="The administrator decides. Include the time window you believe is correct."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCorrectionFor(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="correction-form" icon={Send} loading={submitting}>
              Send request
            </Button>
          </div>
        }
      >
        {correctionFor ? (
          <form id="correction-form" onSubmit={requestCorrection} className="space-y-3">
            <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
              <p className="text-[12px] font-medium text-ink">{correctionFor.name}</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Current record: {formatMinutes(correctionFor.attendedDuration)} of{' '}
                {formatMinutes(correctionFor.eligibleDuration)} eligible ({correctionFor.attendancePercentage}%)
              </p>
            </div>
            <TextArea
              label="Reason for the correction"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="The student joined at 16:05 but the record shows a later join because the connection dropped."
              required
            />
            <FormError>{formError}</FormError>
            <p className="text-[10px] text-soft">
              Requests are audited with your name and the session identifier. Technical interruptions must not be treated
              as misconduct.
            </p>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}

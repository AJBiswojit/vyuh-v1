import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, Clock, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { attendanceService } from '../../services/attendance.service.js'
import { formatDate, formatMinutes, formatTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { DonutChart } from '../../ui/charts.jsx'

export default function AttendancePage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')

  const { data, error, loading, refresh } = useAsync(() => attendanceService.getStudentAttendance(user.id), [user.id])

  const rows = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data.sessions
    return data.sessions.filter((session) => session.status === filter)
  }, [data, filter])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Attendance" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Attendance" />
        <ErrorState error={error} onRetry={refresh} title="Attendance could not be loaded" />
      </div>
    )
  }

  const summary = data.summary

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Attendance"
        description="Attendance is eligible attended minutes divided by eligible class minutes — duration based, with reconnects counted once."
      />

      {summary.eligibleSessions === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={CalendarCheck}
            title="No eligible sessions yet"
            description="Attendance appears once a scheduled class session has ended and its window becomes eligible."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
              <h2 className="text-[13px] font-medium text-ink">Overall attendance</h2>
              <DonutChart
                data={[
                  { name: 'Attended', value: Math.max(summary.percentage, 0.5), color: summary.percentage >= summary.threshold ? '#242729' : '#b08d31' },
                  { name: 'Missed', value: Math.max(100 - summary.percentage, 0.5), color: '#eef0f1' },
                ]}
                height={180}
                innerRadius={54}
                outerRadius={76}
                centerValue={`${summary.percentage}%`}
                centerLabel="attended"
              />
              <div className="mt-2 flex items-center justify-center gap-2">
                <StatusBadge tone={summary.percentage >= summary.threshold ? 'good' : 'warn'}>
                  {summary.percentage >= summary.threshold ? 'Above threshold' : `${summary.threshold - summary.percentage}% below threshold`}
                </StatusBadge>
                <span className="text-[10.5px] text-soft">Requirement {summary.threshold}%</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Attended</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{formatMinutes(summary.attendedMinutes)}</dd>
                </div>
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Eligible</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{formatMinutes(summary.eligibleMinutes)}</dd>
                </div>
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Missed</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{summary.missedSessions}</dd>
                </div>
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Sessions</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{summary.eligibleSessions}</dd>
                </div>
              </dl>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-8">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-medium text-ink">Subject-wise</h2>
                <span className="text-[10.5px] text-soft">Eligible minutes only</span>
              </div>
              <div className="mt-3 space-y-3">
                {data.bySubject.length === 0 ? (
                  <p className="py-6 text-center text-[11.5px] text-soft">No subject-level sessions yet.</p>
                ) : (
                  data.bySubject.map((subject) => (
                    <div key={subject.subjectId}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[12px] font-medium text-ink">{subjectName(subject.subjectId)}</p>
                        <p className="tabular text-[11.5px] text-muted">
                          {subject.percentage}% · {formatMinutes(subject.attendedMinutes)} / {formatMinutes(subject.eligibleMinutes)}
                        </p>
                      </div>
                      <ProgressBar
                        value={subject.percentage}
                        tone={subject.percentage >= summary.threshold ? 'good' : subject.percentage >= summary.threshold - 10 ? 'warn' : 'danger'}
                        className="mt-1"
                        height={5}
                      />
                      <p className="mt-0.5 text-[10px] text-soft">
                        {subject.sessions} session{subject.sessions === 1 ? '' : 's'} · {subject.missed} missed
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {summary.percentage < summary.threshold ? (
            <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#e3d5a8] bg-[var(--cream-100)] p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a6d1f]" aria-hidden="true" />
              <p className="text-[11px] leading-relaxed text-[#7a6220]">
                Your attendance is below the {summary.threshold}% requirement set for your batch. Technical interruptions
                are not treated as absence — if a session dropped because of a connectivity failure, the session detail
                shows the recorded join intervals.
              </p>
            </div>
          ) : null}

          <section className="surface-flat mt-4 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
              <h2 className="text-[13px] font-medium text-ink">Session records</h2>
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'present', label: 'Present' },
                  { id: 'partial', label: 'Partial' },
                  { id: 'absent', label: 'Absent' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] transition ${
                      filter === option.id ? 'bg-[var(--ink)] text-white' : 'text-ink-70 hover:bg-[var(--surface-sunken)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[11.5px] text-soft">No sessions match this filter.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Date</th>
                      <th className="align-right">Attended</th>
                      <th className="align-right">Eligible</th>
                      <th className="align-right">Percent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((session) => (
                      <tr key={session.classId}>
                        <td>
                          <Link to={`/student/live-classes/${session.classId}`} className="font-medium text-ink hover:underline">
                            {session.title}
                          </Link>
                          <p className="text-[10.5px] text-soft">
                            {subjectName(session.subjectId)} · {session.facultyName}
                          </p>
                        </td>
                        <td className="whitespace-nowrap text-[11.5px]">
                          {formatDate(session.scheduledStartAt)}
                          <span className="block text-[10px] text-soft">{formatTime(session.scheduledStartAt)}</span>
                        </td>
                        <td className="align-right tabular">{formatMinutes(session.attendedMinutes)}</td>
                        <td className="align-right tabular">{formatMinutes(session.eligibleMinutes)}</td>
                        <td className="align-right tabular font-medium">{session.percentage}%</td>
                        <td>
                          <StatusBadge tone={statusTone(session.status)} dot>
                            {statusLabel(session.status)}
                          </StatusBadge>
                          {session.connections > 1 ? (
                            <span className="mt-0.5 block text-[9.5px] text-soft">{session.connections} connections</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          {summary.policyNote} Join and leave events are merged per session: reconnecting during the same class never
          double-counts attended time, and minutes outside the eligible window are excluded.
        </p>
        <Clock className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-soft sm:block" aria-hidden="true" />
      </div>
    </div>
  )
}

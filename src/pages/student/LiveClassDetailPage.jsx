import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarClock, Clock, FileText, PlayCircle, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import { attendanceService } from '../../services/attendance.service.js'
import { formatDate, formatTime, relativeTime, formatMinutes } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'

export default function LiveClassDetailPage() {
  const { classId } = useParams()
  const { user } = useAuth()

  const { data, error, loading, refresh } = useAsync(async () => {
    const access = await liveClassService.getStudentClassroomAccess(classId, user.id)
    const attendance = await attendanceService.getAttendanceContext(classId, user.id)
    return { access, attendance }
  }, [classId, user.id])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Live class" title="Loading session" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Live class" title="Session" backTo="/student/live-classes" backLabel="Live classes" />
        <ErrorState error={error} onRetry={refresh} title="This session could not be opened" />
      </div>
    )
  }

  const { access, attendance } = data
  const { klass, canJoin, reason, recording, sessionInfo } = access

  return (
    <div className="mx-auto max-w-[960px]">
      <PageHeader
        eyebrow={`${subjectName(klass.subjectId)} · ${klass.batch?.name}`}
        title={klass.title}
        description={klass.description}
        backTo="/student/live-classes"
        backLabel="Live classes"
        actions={<StatusBadge tone={klass.status === 'live' ? 'danger' : statusTone(klass.status)} dot={klass.status === 'live'}>{statusLabel(klass.status)}</StatusBadge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="surface p-5">
            <h2 className="text-[13.5px] font-medium text-ink">Session details</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Faculty', value: sessionInfo.faculty?.name },
                { label: 'Subject', value: sessionInfo.subject?.name },
                { label: 'Batch', value: [sessionInfo.batch?.name, sessionInfo.batch?.section].filter(Boolean).join(' · ') || '—' },
                { label: 'Duration', value: `${klass.durationMinutes} minutes` },
                { label: 'Scheduled start', value: `${formatDate(klass.scheduledStartAt)} · ${formatTime(klass.scheduledStartAt)}` },
                { label: 'Scheduled end', value: formatTime(klass.scheduledEndAt) },
                { label: 'Session ID', value: klass.sessionId },
                { label: 'Late joining', value: klass.lateJoinAllowed ? 'Allowed within the policy window' : 'Not permitted' },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="label-xs">{item.label}</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>

            {klass.resourceName ? (
              <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-[var(--line)] p-3">
                <FileText className="h-4 w-4 shrink-0 text-ink-60" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-ink">{klass.resourceName}</p>
                  <p className="text-[10.5px] text-soft">Shared by the faculty for this session (demo reference only).</p>
                </div>
              </div>
            ) : null}

            {klass.status === 'cancelled' ? (
              <div className="mt-4 rounded-[10px] border border-[#e8c9c9] bg-[#fdf6f6] p-3">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#7d2b2b]">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Session cancelled
                </p>
                <p className="mt-1 text-[11px] text-[#7d2b2b]/85">{klass.cancellationReason || 'The faculty cancelled this session.'}</p>
              </div>
            ) : null}
          </section>

          {attendance ? (
            <section className="surface p-5">
              <h2 className="text-[13.5px] font-medium text-ink">Your attendance for this session</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={attendance.attendancePercentage}
                    label="Attended duration"
                    tone={attendance.attendancePercentage >= attendance.threshold ? 'good' : attendance.attendancePercentage > 0 ? 'warn' : 'danger'}
                  />
                </div>
                <StatusBadge tone={statusTone(attendance.status)}>{statusLabel(attendance.status)}</StatusBadge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Attended</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{formatMinutes(attendance.attendedDuration)}</dd>
                </div>
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Eligible</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{formatMinutes(attendance.eligibleDuration)}</dd>
                </div>
                <div className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                  <dt className="label-xs">Threshold</dt>
                  <dd className="mt-0.5 font-medium tabular text-ink">{attendance.threshold}%</dd>
                </div>
              </dl>
              <p className="mt-2 text-[10.5px] leading-snug text-soft">
                Join and leave intervals are recomputed from your session events; reconnections never double-count time.
              </p>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <section className="surface p-5">
            <h2 className="text-[13.5px] font-medium text-ink">Join</h2>
            {canJoin ? (
              <>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  The session is live. Joining records your attendance start time.
                </p>
                <Link to={`/student/live-classes/${klass.id}/room`} className="btn btn-primary mt-3 w-full">
                  Enter classroom <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{reason}</p>
                {recording?.status === 'published' ? (
                  <Link to={`/student/recordings/${recording.id}`} className="btn btn-secondary mt-3 w-full">
                    <PlayCircle className="h-3.5 w-3.5" /> Watch the recording
                  </Link>
                ) : klass.status === 'recording-processing' ? (
                  <p className="mt-3 rounded-[8px] bg-[var(--cream-100)] px-2.5 py-2 text-[11px] text-[#7a6220]">
                    The recording is being processed and will be published shortly.
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Session timeline
            </p>
            <ul className="mt-2 space-y-2 text-[11px] text-muted">
              <li className="flex justify-between gap-2">
                <span>Scheduled start</span>
                <span className="text-ink">{formatTime(klass.scheduledStartAt)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Actual start</span>
                <span className="text-ink">{klass.sessionStartedAt ? formatTime(klass.sessionStartedAt) : '—'}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Session ended</span>
                <span className="text-ink">{klass.sessionEndedAt ? formatTime(klass.sessionEndedAt) : '—'}</span>
              </li>
              {klass.sessionEndedAt ? (
                <li className="flex justify-between gap-2">
                  <span>Ended</span>
                  <span className="text-ink">{relativeTime(klass.sessionEndedAt)}</span>
                </li>
              ) : null}
            </ul>
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> Batch
            </p>
            <p className="mt-1 text-[11.5px] text-muted">
              {sessionInfo.batch?.name} · {sessionInfo.batch?.studentIds.length} enrolled students
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10.5px] text-soft">
              <Clock className="h-3 w-3" aria-hidden="true" /> Attendance threshold {sessionInfo.batch?.attendanceThreshold}%
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

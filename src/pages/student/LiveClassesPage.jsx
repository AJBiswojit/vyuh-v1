import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, Clock, Radio, RotateCcw, Video } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import { formatDayLabel, formatTime, relativeTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, EmptyState, SkeletonCards } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'

const TABS = [
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

function ClassCard({ klass, tab }) {
  const isLive = ['live', 'starting'].includes(klass.status)
  return (
    <div className="surface-flat p-4 transition hover:border-[var(--line-strong)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={isLive ? 'danger' : statusTone(klass.status)} dot={isLive}>
              {isLive ? 'Live' : statusLabel(klass.status)}
            </StatusBadge>
            <span className="badge badge-sky">{subjectName(klass.subjectId)}</span>
            <span className="badge badge-outline">{klass.durationMinutes} min</span>
          </div>
          <h3 className="mt-2 text-[14px] font-medium leading-snug text-ink">{klass.title}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted clamp-2">{klass.description}</p>
        </div>
        {isLive ? (
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fbeeee] text-[#8c2f2f] sm:flex">
            <Radio className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {formatDayLabel(klass.scheduledStartAt)} · {formatTime(klass.scheduledStartAt)} – {formatTime(klass.scheduledEndAt)}
        </span>
        <span>{klass.faculty?.name}</span>
        <span>{klass.batch?.name}</span>
        {klass.attendanceRecord ? (
          <span className="inline-flex items-center gap-1 text-[#375f34]">
            <Clock className="h-3 w-3" aria-hidden="true" /> joined {relativeTime(klass.attendanceRecord.joinEvents?.[0]?.at)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        {isLive ? (
          <Link to={`/student/live-classes/${klass.id}/room`} className="btn btn-primary btn-sm">
            Join classroom <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        <Link to={`/student/live-classes/${klass.id}`} className="btn btn-secondary btn-sm">
          {tab === 'completed' ? 'Session details' : 'Class details'}
        </Link>
        {klass.recording?.status === 'published' ? (
          <Link to={`/student/recordings/${klass.recording.id}`} className="btn btn-ghost btn-sm">
            Watch recording
          </Link>
        ) : klass.status === 'recording-processing' ? (
          <StatusBadge tone="warn">Recording processing</StatusBadge>
        ) : null}
      </div>
    </div>
  )
}

export default function LiveClassesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('live')
  const { data, error, loading, refresh } = useAsync(() => liveClassService.getStudentClasses(user.id), [user.id])

  const counts = { live: data?.live.length || 0, upcoming: data?.upcoming.length || 0, completed: data?.completed.length || 0 }

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Live Classes"
        description="Join only the sessions scheduled for your batch. Attendance is calculated from the time you are actually connected."
        actions={
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => refresh()}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <SkeletonCards count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="Your class schedule could not be loaded" />
      ) : (
        <>
          {data.live.length ? (
            <div className="surface-deep mb-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/60">
                    <span className="dot bg-[#9adf8f]" /> Session in progress
                  </p>
                  <p className="mt-1 text-[15px] font-medium">{data.live[0].title}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/70">
                    {data.live[0].faculty?.name} · started {relativeTime(data.live[0].sessionStartedAt)}
                  </p>
                </div>
                <Link to={`/student/live-classes/${data.live[0].id}/room`} className="btn btn-sky btn-sm">
                  Join classroom <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="tab-row mb-4" role="tablist" aria-label="Class groups">
            {TABS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="tab" onClick={() => setTab(item.id)}>
                {item.label} <span className="ml-1.5 text-[10.5px] text-soft">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          {data[tab].length === 0 ? (
            <div className="surface-flat">
              <EmptyState
                icon={Video}
                title={tab === 'live' ? 'No session running' : tab === 'upcoming' ? 'No classes scheduled' : 'No completed sessions'}
                description={
                  tab === 'live'
                    ? 'When your faculty starts a session it appears here with a join button.'
                    : tab === 'upcoming'
                      ? 'Scheduled classes for your batch appear here as soon as faculty publish them.'
                      : 'Completed sessions, attendance records and recordings will collect here.'
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data[tab].map((klass) => (
                <ClassCard key={klass.id} klass={klass} tab={tab} />
              ))}
            </div>
          )}

          <p className="mt-4 text-[10.5px] leading-relaxed text-soft">
            Classroom is a local demonstration: your camera and microphone preview stay on this device. There is no
            signalling server, so other participants cannot see or hear your media.
          </p>
        </>
      )}
    </div>
  )
}

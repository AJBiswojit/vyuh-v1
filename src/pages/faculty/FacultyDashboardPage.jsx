import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardList,
  MessageSquare,
  MonitorPlay,
  Plus,
  Radio,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import { examService } from '../../services/exam.service.js'
import { doubtService } from '../../services/doubt.service.js'
import { questionService } from '../../services/question.service.js'
import { performanceService } from '../../services/performance.service.js'
import { formatDate, formatTime, relativeTime, greetingForNow } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatTile, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { DonutChart, CHART_TONE } from '../../ui/charts.jsx'

export default function FacultyDashboardPage() {
  const { user } = useAuth()

  const { data, error, loading, refresh } = useAsync(async () => {
    const [classes, exams, doubts, questionStats, teaching] = await Promise.all([
      liveClassService.getFacultyClassOverview(user.id),
      examService.getFacultyExams(user.id),
      doubtService.listFacultyDoubts(user.id),
      questionService.getStats(),
      performanceService.getFacultyTeachingPerformance(user.id),
    ])
    return { classes, exams, doubts, questionStats, teaching }
  }, [user.id])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title={`${greetingForNow()}, ${user.name.split(' ')[0]}`} />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Faculty dashboard" />
        <ErrorState error={error} onRetry={refresh} title="Your dashboard could not be loaded" />
      </div>
    )
  }

  const { classes, exams, doubts, questionStats, teaching } = data
  const liveClass = classes.live[0] || null
  const nextClass = classes.upcoming[0] || null
  const drafts = exams.filter((exam) => exam.status === 'draft')
  const awaitingReview = exams.filter((exam) => exam.status === 'pending-approval')
  const openDoubts = doubts.doubts.filter((doubt) => doubt.status === 'open')
  const highPriority = openDoubts.filter((doubt) => doubt.priority === 'high')

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        eyebrowTone="cream"
        title={`${greetingForNow()}, ${user.name.split(' ')[0]}`}
        description={`${teaching.classes.upcoming} upcoming session${teaching.classes.upcoming === 1 ? '' : 's'} · ${openDoubts.length} doubt${openDoubts.length === 1 ? '' : 's'} waiting on you.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/faculty/exams/new" className="btn btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" /> Create examination
            </Link>
            <Link to="/faculty/question-bank/new" className="btn btn-secondary btn-sm">
              <BookOpen className="h-3.5 w-3.5" /> Add question
            </Link>
          </div>
        }
      />

      {liveClass ? (
        <div className="surface-deep mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="stat-icon !h-9 !w-9 !border-white/25 !bg-white/15 !text-white" aria-hidden="true">
              <Radio className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/70">
                <span className="dot bg-[#a6e59a]" /> Your session is live
              </p>
              <p className="mt-0.5 text-[15px] font-medium text-white">{liveClass.title}</p>
              <p className="mt-0.5 text-[11.5px] text-white/70">
                {liveClass.batch?.name} · started {relativeTime(liveClass.sessionStartedAt)}
              </p>
            </div>
          </div>
          <Link to={`/faculty/classes/${liveClass.id}/studio`} className="btn btn-sky btn-sm">
            Open studio <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Classes taken', value: teaching.classes.completed, hint: `${teaching.classes.total} scheduled in total`, to: '/faculty/classes', icon: MonitorPlay },
          { label: 'Examinations', value: teaching.exams.total, hint: `${drafts.length} draft · ${awaitingReview.length} awaiting approval`, to: '/faculty/exams', icon: ClipboardList },
          { label: 'Questions authored', value: questionStats.total, hint: `${questionStats.active} active in the bank`, to: '/faculty/question-bank', icon: BookOpen },
          { label: 'Doubts pending', value: openDoubts.length, hint: `${highPriority.length} marked high priority`, to: '/faculty/doubts', icon: MessageSquare },
        ].map((tile, index) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            icon={tile.icon}
            to={tile.to}
            tone={index === 0 ? 'sky' : index === 2 ? 'cream' : index === 3 ? 'warn' : 'default'}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
          <div className="card-rule" aria-hidden="true" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-ink">Schedule</h2>
            <Link to="/faculty/classes" className="text-[11px] font-medium text-link hover:underline">
              All classes
            </Link>
          </div>
          {classes.upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarClock}
              title="No upcoming sessions"
              description="Schedule a live class for your batch and it will appear here."
            />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {classes.upcoming.slice(0, 4).map((klass) => (
                <li key={klass.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">{klass.title}</p>
                    <p className="text-[10.5px] text-soft">
                      {klass.batch?.name} · {formatDate(klass.scheduledStartAt)} · {formatTime(klass.scheduledStartAt)}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(klass.status)}>{statusLabel(klass.status)}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
          {nextClass ? (
            <div className="note-strip mt-3">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <p className="leading-snug">
                Next session {relativeTime(nextClass.scheduledStartAt)} · {nextClass.batch?.name}
              </p>
            </div>
          ) : null}
        </section>

        <section className="surface-sky p-4 sm:p-5 lg:col-span-5">
          <div className="card-rule" aria-hidden="true" />
          <h2 className="mt-2 text-[13.5px] font-medium text-[var(--sky-900)]">Attendance across your classes</h2>
          <div className="mt-1">
            <DonutChart
              data={[
                { name: 'Present', value: Math.max(teaching.attendance.averagePercentage, 0.5), color: CHART_TONE.primary },
                { name: 'Missed', value: Math.max(100 - teaching.attendance.averagePercentage, 0.5), color: CHART_TONE.track },
              ]}
              height={150}
              innerRadius={44}
              outerRadius={62}
              centerValue={`${teaching.attendance.averagePercentage}%`}
              centerLabel="average"
            />
          </div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="legend-key" style={{ '--key': CHART_TONE.primary }}>
              Present
            </span>
            <span className="legend-key" style={{ '--key': CHART_TONE.track }}>
              Missed
            </span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--sky-800)]">
            Averaged across {teaching.attendance.sessions} session{teaching.attendance.sessions === 1 ? '' : 's'} you have
            taught, computed from join/leave events.
          </p>
          <Link to="/faculty/attendance" className="btn btn-secondary btn-sm mt-2.5 w-full">
            Open attendance
          </Link>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-cream p-4 sm:p-5 lg:col-span-6">
          <div className="card-rule" data-tone="cream" aria-hidden="true" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-[var(--cream-900)]">Doubts awaiting reply</h2>
            <Link to="/faculty/doubts" className="text-[11px] font-medium text-link hover:underline">
              Inbox
            </Link>
          </div>
          {openDoubts.length === 0 ? (
            <EmptyState compact icon={MessageSquare} title="Inbox clear" description="No student doubt is waiting for your reply." />
          ) : (
            <ul className="mt-2 space-y-2">
              {openDoubts.slice(0, 4).map((doubt) => (
                <li key={doubt.id}>
                  <Link
                    to={`/faculty/doubts/${doubt.id}`}
                    className="block rounded-[10px] border border-[var(--cream-300)] bg-white/75 p-2.5 transition hover:border-[var(--cream-500)]"
                  >
                    <div className="flex items-center gap-2">
                      {doubt.priority === 'high' ? <StatusBadge tone="danger">High</StatusBadge> : null}
                      <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{doubt.title}</p>
                      <span className="shrink-0 text-[9.5px] text-soft">{relativeTime(doubt.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-soft">
                      {doubt.student?.name} · {doubt.topicName}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-6">
          <div className="card-rule" aria-hidden="true" />
          <h2 className="mt-2 text-[13.5px] font-medium text-ink">Examination pipeline</h2>
          {exams.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title="No examinations yet"
              description="Create an examination, add sections and publish it when it is ready."
            />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {exams.slice(0, 5).map((exam) => (
                <li key={exam.id}>
                  <Link to={`/faculty/exams/${exam.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">{exam.title}</p>
                      <p className="text-[10.5px] text-soft">
                        {exam.totalQuestions} questions · {exam.totalMarks} marks · {formatDate(exam.startAt)}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(exam.status)} dot>
                      {statusLabel(exam.status)}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Link to="/faculty/exams" className="btn btn-secondary btn-sm">
              Manage examinations
            </Link>
            <Link to="/faculty/item-analysis" className="btn btn-ghost btn-sm">
              <TrendingUp className="h-3.5 w-3.5" /> Item analysis
            </Link>
          </div>
        </section>
      </div>

      <div className="surface-sky mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="stat-icon" aria-hidden="true">
            <Radio className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--sky-900)]">Start a live session</p>
            <p className="mt-0.5 text-[11px] text-[var(--sky-800)]">
              Launching a studio opens the shared class session that students join, with attendance and recording hooks.
            </p>
          </div>
        </div>
        <Link to="/faculty/classes" className="btn btn-primary btn-sm">
          Go to classes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-soft">
        Every figure on this dashboard is computed from the stored records — attendance from session events, marks from
        the marking scheme, and doubt counts from the faculty inbox.
      </p>
    </div>
  )
}

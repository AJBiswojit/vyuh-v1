import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Video,
  FileText,
  MessageSquare,
  PlayCircle,
  Clock,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Timer,
  Target,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { userService } from '../../services/user.service.js'
import { examService } from '../../services/exam.service.js'
import { liveClassService } from '../../services/live-class.service.js'
import { attendanceService } from '../../services/attendance.service.js'
import { doubtService } from '../../services/doubt.service.js'
import { recordingService } from '../../services/recording.service.js'
import { notificationService } from '../../services/notification.service.js'
import { analysisService } from '../../services/analysis.service.js'
import { formatTime, formatDate, formatDayLabel, relativeTime, greetingForNow } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock, SkeletonCards, EmptyState } from '../../ui/states.jsx'
import { BentoCard, PageHeader, ProgressBar, StatusBadge, Timeline } from '../../ui/workspace-kit.jsx'
import { DonutChart, CHART_TONE } from '../../ui/charts.jsx'
import { AccountAvatar, RoleTag } from '../../ui/account-identity.jsx'

/* Computed once per page load: the header eyebrow is a label, not a clock. */
const TODAY_LABEL = formatDate(new Date())

function countdownParts(targetIso) {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, over: true }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    over: false,
  }
}

export default function StudentDashboard() {
  const { user } = useAuth()

  const { data, error, loading, refresh } = useAsync(
    async () => {
      const [student, exams, classes, attendance, doubts, recordings, notifications, performance] = await Promise.all([
        userService.getStudent(user.id),
        examService.getStudentExams(user.id),
        liveClassService.getStudentClasses(user.id),
        attendanceService.getStudentAttendance(user.id),
        doubtService.listStudentDoubts(user.id),
        recordingService.listRecordings({ forStudentId: user.id }),
        notificationService.listForUser(user.id),
        analysisService.getStudentPerformance(user.id),
      ])
      return { student, exams, classes, attendance, doubts, recordings, notifications, performance }
    },
    [user.id],
  )

  const nextExam = useMemo(() => {
    const upcoming = data?.exams?.upcoming || []
    return [...upcoming].sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0] || null
  }, [data])

  const countdown = nextExam ? countdownParts(nextExam.startAt) : null

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Dashboard" />
        <ErrorState error={error} onRetry={refresh} title="Your dashboard could not load" />
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Dashboard" description="Loading your academic snapshot…" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-[190px] rounded-[22px] lg:col-span-2" />
          <div className="skeleton h-[190px] rounded-[22px]" />
        </div>
        <SkeletonCards count={3} className="mt-4" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <LoadingBlock rows={5} />
          <LoadingBlock rows={5} />
        </div>
      </div>
    )
  }

  const { student, classes, attendance, doubts, recordings, notifications, performance } = data
  const liveClass = classes.live[0] || null
  const nextClass = classes.upcoming[0] || null
  const latestResult = performance.points[0] || null
  const attendancePct = attendance.summary.attendancePercentage
  const threshold = attendance.summary.threshold
  const pendingDoubts = doubts.doubts.filter((doubt) => doubt.status === 'open').length
  const answeredDoubts = doubts.doubts.filter((doubt) => doubt.replies.length > 0 && doubt.status !== 'resolved')
  const recentRecording = recordings[0] || null

  const timeline = [
    ...notifications.items.slice(0, 5).map((item) => ({
      id: `n_${item.id}`,
      title: item.title,
      body: item.body,
      meta: relativeTime(item.createdAt),
      tone: item.type.includes('warning') || item.type.includes('integrity') ? 'warn' : 'ink',
    })),
    ...doubts.doubts.slice(0, 2).map((doubt) => ({
      id: `d_${doubt.id}`,
      title: doubt.replies.length ? `Reply received on “${doubt.title}”` : `Doubt submitted: ${doubt.title}`,
      body: doubt.replies.length ? doubt.replies[doubt.replies.length - 1].body.slice(0, 110) : `Waiting for ${doubt.faculty?.name}`,
      meta: relativeTime(doubt.updatedAt),
      tone: doubt.replies.length ? 'sky' : 'ink',
    })),
  ].slice(0, 6)

  return (
    <div>
      <PageHeader
        eyebrow={`${greetingForNow()}, ${user.name.split(' ')[0]} · ${TODAY_LABEL}`}
        title="Dashboard"
        description="Your examinations, classes and academic signals for today."
        actions={
          <>
            <Link to="/student/exams" className="btn btn-secondary btn-sm">
              <FileText className="h-3.5 w-3.5" /> Exams
            </Link>
            <Link to="/student/live-classes" className="btn btn-primary btn-sm">
              <Video className="h-3.5 w-3.5" /> Live classes
            </Link>
          </>
        }
      />

      {/* identity + next exam */}
      <div className="grid gap-4 lg:grid-cols-12">
        <BentoCard className="lg:col-span-5" tone="cream" delay={0.02}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <AccountAvatar name={user.name} role="student" size="lg" />
              <div className="min-w-0">
                <p className="label-xs">Student profile</p>
                <h2 className="mt-0.5 font-serif text-[23px] leading-tight tracking-[-0.02em] text-ink">{user.name}</h2>
                <p className="mt-0.5 text-[11.5px] text-[var(--cream-800)]">
                  {student.batch?.name} · {student.batch?.section} section
                </p>
              </div>
            </div>
            <RoleTag role="student" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[var(--cream-300)] pt-3.5">
            {[
              { label: 'Roll number', value: student.profile?.rollNumber, mono: true },
              { label: 'Enrolment', value: student.enrollmentId, mono: true },
              { label: 'Target exam', value: student.profile?.targetExam },
              { label: 'Mentor', value: student.mentor?.name || '—' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="label-xs">{item.label}</dt>
                <dd className={`mt-0.5 text-[12.5px] font-medium text-ink ${item.mono ? 'tabular' : ''}`}>{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="note-strip mt-3" data-tone="cream">
            <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="leading-snug">{student.profile?.goal}</span>
          </div>
        </BentoCard>

        <BentoCard
          className="lg:col-span-4"
          tone="sky"
          eyebrow="Next examination"
          delay={0.05}
          action={
            nextExam ? (
              <Link to={`/student/exams/${nextExam.id}/instructions`} className="text-[11px] font-medium text-link hover:underline">
                Instructions →
              </Link>
            ) : null
          }
          footer={
            countdown ? (
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {countdown.over
                  ? 'Window is open now'
                  : `Starts in ${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`}
              </div>
            ) : null
          }
        >
          {nextExam ? (
            <div>
              <div className="flex items-start gap-2.5">
                <span className="stat-icon" aria-hidden="true">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium leading-snug text-[var(--sky-900)]">{nextExam.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-[var(--sky-800)]/80">
                    {nextExam.type} · {formatDate(nextExam.startAt)} at {formatTime(nextExam.startAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Questions', value: nextExam.totalQuestions },
                  { label: 'Minutes', value: nextExam.durationMinutes },
                  { label: 'Marks', value: nextExam.totalMarks },
                ].map((item) => (
                  <div key={item.label} className="rounded-[8px] border border-[var(--sky-200)] bg-white/85 px-2 py-1.5">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--sky-700)]">{item.label}</p>
                    <p className="mt-0.5 text-[13px] font-medium tabular text-[var(--sky-900)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState compact icon={FileText} title="No examination scheduled" description="New papers appear here as soon as your faculty publishes them." />
          )}
        </BentoCard>

        <BentoCard
          className="lg:col-span-3"
          eyebrow="Attendance"
          delay={0.08}
          tone={attendancePct < threshold ? 'cream' : 'default'}
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-muted">{attendance.attendedHours}h attended</span>
              <StatusBadge tone={attendancePct < threshold ? 'warn' : 'good'} dot>
                {attendancePct < threshold ? `Below ${threshold}%` : `Above ${threshold}%`}
              </StatusBadge>
            </div>
          }
        >
          <DonutChart
            data={[
              {
                name: 'Attended',
                value: Math.max(attendancePct, 0.5),
                color: attendancePct < threshold ? CHART_TONE.warn : CHART_TONE.primary,
              },
              { name: 'Balance', value: Math.max(100 - attendancePct, 0.5), color: CHART_TONE.track },
            ]}
            height={132}
            innerRadius={42}
            outerRadius={62}
            centerValue={`${attendancePct}%`}
            centerLabel="overall"
          />
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="legend-key" style={{ '--key': attendancePct < threshold ? CHART_TONE.warn : CHART_TONE.primary }}>
              Attended
            </span>
            <span className="legend-key" style={{ '--key': CHART_TONE.track }}>
              Missed
            </span>
          </div>
        </BentoCard>
      </div>

      {/* live + quick actions */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <BentoCard
          className="lg:col-span-5"
          tone={liveClass ? 'deep' : 'sky'}
          eyebrow={liveClass ? 'Live now' : 'Upcoming class'}
          delay={0.1}
        >
          {liveClass ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
                  <span className="dot bg-[#a6e59a]" /> In session
                </span>
                <span className="text-[10.5px] text-white/70">Started {relativeTime(liveClass.sessionStartedAt)}</span>
              </div>
              <h3 className="mt-2 text-[16px] font-medium leading-snug text-white">{liveClass.title}</h3>
              <p className="mt-1 text-[11.5px] text-white/75">
                {liveClass.faculty?.name} · {subjectName(liveClass.subjectId)}
              </p>
              <Link to={`/student/live-classes/${liveClass.id}/room`} className="btn btn-sky btn-sm mt-4">
                <Video className="h-3.5 w-3.5" /> Join classroom <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : nextClass ? (
            <>
              <div className="flex items-start gap-2.5">
                <span className="stat-icon" aria-hidden="true">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium leading-snug text-[var(--sky-900)]">{nextClass.title}</h3>
                  <p className="mt-0.5 text-[11.5px] text-[var(--sky-800)]/80">
                    {nextClass.faculty?.name} · {formatDayLabel(nextClass.scheduledStartAt)} at {formatTime(nextClass.scheduledStartAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link to={`/student/live-classes/${nextClass.id}`} className="btn btn-primary btn-sm">
                  Class details <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--sky-800)]">
                  <Timer className="h-3 w-3" aria-hidden="true" />
                  {relativeTime(nextClass.scheduledStartAt)}
                </span>
              </div>
            </>
          ) : (
            <EmptyState compact icon={Video} title="No live class scheduled" description="Your faculty schedule will appear here." />
          )}
        </BentoCard>

        <BentoCard className="lg:col-span-4" eyebrow="Quick actions" delay={0.12}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/student/doubts?tab=ai', label: 'Ask AI assistant', icon: Sparkles, tone: 'sky', hint: 'Instant help' },
              { to: '/student/doubts?tab=faculty', label: 'Ask faculty', icon: MessageSquare, tone: 'cream', hint: 'Goes to your teacher' },
              { to: '/student/recordings', label: 'Watch recording', icon: PlayCircle, tone: 'white', hint: 'Published classes' },
              { to: '/student/performance', label: 'Performance', icon: TrendingUp, tone: 'white', hint: 'Trends & topics' },
            ].map((action) => {
              const Icon = action.icon
              const toneClass =
                action.tone === 'sky'
                  ? 'border-[var(--sky-200)] bg-[var(--sky-50)] hover:border-[var(--sky-400)]'
                  : action.tone === 'cream'
                    ? 'border-[var(--cream-300)] bg-[var(--cream-50)] hover:border-[var(--cream-500)]'
                    : 'border-[var(--line)] bg-white hover:border-[var(--sky-300)]'
              const iconTone = action.tone === 'cream' ? 'cream' : 'sky'
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`group flex flex-col gap-1.5 rounded-[12px] border p-2.5 transition hover:shadow-[var(--shadow-sm)] ${toneClass}`}
                >
                  <span className="stat-icon" data-tone={iconTone}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-[11.5px] font-medium leading-snug text-ink">{action.label}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.08em] text-soft">{action.hint}</span>
                </Link>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] leading-snug text-soft">
            Doubt tools are demonstration flows backed by local mock records.
          </p>
        </BentoCard>

        <BentoCard
          className="lg:col-span-3"
          tone="cream"
          eyebrow="Latest result"
          delay={0.14}
          action={
            latestResult ? (
              <Link to={`/student/exams/${latestResult.examId}/result`} className="text-[11px] font-medium text-[var(--cream-900)] underline-offset-2 hover:underline">
                Open
              </Link>
            ) : null
          }
        >
          {latestResult ? (
            <>
              <div className="flex items-baseline gap-2">
                <p className="stat-figure text-[var(--cream-900)]">{latestResult.percentage}%</p>
                <StatusBadge tone={latestResult.percentage >= 60 ? 'good' : latestResult.percentage >= 40 ? 'warn' : 'danger'}>
                  {latestResult.percentage >= 60 ? 'Strong' : latestResult.percentage >= 40 ? 'Steady' : 'Needs work'}
                </StatusBadge>
              </div>
              <p className="mt-1 text-[11.5px] font-medium leading-snug text-ink clamp-2">{latestResult.examTitle}</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10.5px]">
                <div className="rounded-[8px] border border-[var(--cream-300)] bg-white/70 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--cream-800)]">Marks</p>
                  <p className="mt-0.5 font-medium tabular text-ink">{latestResult.awardedMarks}/{latestResult.maxMarks}</p>
                </div>
                <div className="rounded-[8px] border border-[var(--cream-300)] bg-white/70 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--cream-800)]">Accuracy</p>
                  <p className="mt-0.5 font-medium tabular text-ink">{latestResult.accuracy}%</p>
                </div>
              </div>
              <ProgressBar value={latestResult.percentage} max={100} tone="cream" className="mt-2.5" height={5} />
              <p className="mt-1.5 text-[10px] text-[var(--cream-800)]">{formatDate(latestResult.submittedAt)}</p>
            </>
          ) : (
            <EmptyState compact icon={TrendingUp} title="No graded attempt yet" description="Results appear after your first submission." />
          )}
        </BentoCard>
      </div>

      {/* insights, doubts, recordings, timeline */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <BentoCard className="lg:col-span-4" tone="sky" eyebrow="Performance insights" title="Weakest topics" delay={0.16}
          action={<Link to="/student/performance" className="text-[11px] font-medium text-link hover:underline">All</Link>}
        >
          {performance.topicTrend.length === 0 ? (
            <EmptyState compact icon={TrendingUp} title="Nothing to analyse yet" description="Attempt an examination to unlock topic insights." />
          ) : (
            <ul className="space-y-3">
              {performance.topicTrend.slice(0, 3).map((topic) => (
                <li key={topic.topicId}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-medium text-ink">{topic.topicName}</span>
                    <span className="shrink-0 text-[11px] tabular text-muted">{topic.accuracy}%</span>
                  </div>
                  <ProgressBar
                    value={topic.accuracy}
                    tone={topic.accuracy < 45 ? 'danger' : topic.accuracy < 75 ? 'warn' : 'good'}
                    height={5}
                    className="mt-1.5"
                  />
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        <BentoCard className="lg:col-span-4" eyebrow="Doubts" title="Needs your attention" delay={0.18}
          action={<Link to="/student/doubts" className="text-[11px] font-medium text-link hover:underline">Open</Link>}
        >
          {answeredDoubts.length ? (
            <ul className="space-y-2">
              {answeredDoubts.slice(0, 2).map((doubt) => (
                <li key={doubt.id}>
                  <Link to={`/student/doubts/${doubt.id}`} className="block rounded-[10px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2.5 transition hover:border-[var(--sky-400)]">
                    <p className="text-[11.5px] font-medium leading-snug text-ink clamp-1">{doubt.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {doubt.faculty?.name} replied · {relativeTime(doubt.lastActivityAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="note-strip mt-3">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="leading-snug">
              <span className="font-medium">{pendingDoubts} awaiting a reply</span> · {answeredDoubts.length} with faculty replies
            </p>
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-4" tone="cream" eyebrow="Recordings" title="Recently published" delay={0.2}
          action={<Link to="/student/recordings" className="text-[11px] font-medium text-link hover:underline">Library</Link>}
        >
          {recentRecording ? (
            <Link to={`/student/recordings/${recentRecording.id}`} className="group block">
              <div className="relative overflow-hidden rounded-[12px] border border-[var(--cream-300)]">
                <img src={recentRecording.posterUrl} alt="" className="h-[92px] w-full object-cover" loading="lazy" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                  <PlayCircle className="h-7 w-7 text-white" />
                </span>
              </div>
              <p className="mt-2 text-[12px] font-medium leading-snug text-ink clamp-2">{recentRecording.title}</p>
              <p className="mt-0.5 text-[10.5px] text-muted">
                {subjectName(recentRecording.subjectId)} · {formatDate(recentRecording.publishedAt)}
              </p>
            </Link>
          ) : (
            <EmptyState compact icon={PlayCircle} title="No recordings yet" description="Published class recordings appear here." />
          )}
        </BentoCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <BentoCard className="lg:col-span-7" eyebrow="Academic activity" title="Your timeline" delay={0.22}>
          <Timeline items={timeline} emptyLabel="No recent activity" />
        </BentoCard>

        <BentoCard className="lg:col-span-5" eyebrow="Notifications" title="Important updates" delay={0.24}>
          {notifications.items.length === 0 ? (
            <EmptyState compact title="Nothing new" description="Examination and class updates will appear here." />
          ) : (
            <ul className="space-y-2">
              {notifications.items.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.read ? 'bg-[var(--line-strong)]' : 'bg-[var(--sky-600)]'}`} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium leading-snug text-ink clamp-1">{item.title}</p>
                    <p className="text-[10.5px] text-soft">{relativeTime(item.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3">
            <div>
              <p className="label-xs">Attendance</p>
              <p className="mt-0.5 text-[12px] font-medium text-ink">{attendance.summary.sessions} sessions</p>
            </div>
            <div>
              <p className="label-xs">Classes attended</p>
              <p className="mt-0.5 text-[12px] font-medium text-ink">
                {attendance.records.filter((record) => record.attendedDuration > 0).length} of {classes.completed.length + classes.live.length}
              </p>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  )
}

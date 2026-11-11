import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Video, FileText, MessageSquare, PlayCircle, Clock, TrendingUp, Sparkles } from 'lucide-react'
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
import { BentoCard, PageHeader, ProgressBar, Timeline } from '../../ui/workspace-kit.jsx'
import { DonutChart } from '../../ui/charts.jsx'

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
        eyebrow={`${greetingForNow()}, ${user.name.split(' ')[0]}`}
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
            <div className="min-w-0">
              <p className="label-xs">Student profile</p>
              <h2 className="mt-1 font-serif text-[24px] leading-tight tracking-[-0.02em] text-ink">{user.name}</h2>
              <p className="mt-1 text-[12px] text-ink-70">
                {student.batch?.name} · {student.batch?.section} section
              </p>
            </div>
            <span className="badge badge-ink">{student.profile?.rollNumber}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[var(--cream-300)] pt-3.5">
            <div>
              <dt className="label-xs">Enrolment</dt>
              <dd className="text-[12.5px] font-medium text-ink">{student.enrollmentId}</dd>
            </div>
            <div>
              <dt className="label-xs">Target exam</dt>
              <dd className="text-[12.5px] font-medium text-ink">{student.profile?.targetExam}</dd>
            </div>
            <div>
              <dt className="label-xs">Mentor</dt>
              <dd className="text-[12.5px] font-medium text-ink">{student.mentor?.name || '—'}</dd>
            </div>
            <div>
              <dt className="label-xs">Study goal</dt>
              <dd className="text-[12px] leading-snug text-ink-80">{student.profile?.goal}</dd>
            </div>
          </dl>
        </BentoCard>

        <BentoCard
          className="lg:col-span-4"
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
              <h3 className="text-[15px] font-medium leading-snug text-ink">{nextExam.title}</h3>
              <p className="mt-1 text-[11.5px] text-muted">
                {nextExam.type} · {formatDate(nextExam.startAt)} at {formatTime(nextExam.startAt)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <span className="badge badge-sky">{nextExam.totalQuestions} questions</span>
                <span className="badge">{nextExam.durationMinutes} min</span>
                <span className="badge">{nextExam.totalMarks} marks</span>
              </div>
            </div>
          ) : (
            <EmptyState compact icon={FileText} title="No examination scheduled" description="New papers appear here as soon as your faculty publishes them." />
          )}
        </BentoCard>

        <BentoCard className="lg:col-span-3" eyebrow="Attendance" delay={0.08} tone={attendancePct < threshold ? 'cream' : 'default'}>
          <DonutChart
            data={[
              { name: 'Attended', value: Math.max(attendancePct, 0.5), color: attendancePct < threshold ? '#b08d31' : '#242729' },
              { name: 'Balance', value: Math.max(100 - attendancePct, 0.5), color: '#eef0f1' },
            ]}
            height={132}
            innerRadius={42}
            outerRadius={62}
            centerValue={`${attendancePct}%`}
            centerLabel="overall"
          />
          <p className="mt-1 text-center text-[10.5px] text-soft">Threshold {threshold}% · {attendance.attendedHours}h attended</p>
        </BentoCard>
      </div>

      {/* live + quick actions */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <BentoCard
          className="lg:col-span-5"
          tone={liveClass ? 'ink' : 'default'}
          eyebrow={liveClass ? 'Live now' : 'Upcoming class'}
          delay={0.1}
        >
          {liveClass ? (
            <>
              <h3 className="text-[15px] font-medium leading-snug text-white">{liveClass.title}</h3>
              <p className="mt-1 text-[11.5px] text-white/70">
                {liveClass.faculty?.name} · {subjectName(liveClass.subjectId)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[10.5px] text-white">
                  <span className="dot bg-[#9adf8f]" /> In session
                </span>
                <span className="text-[10.5px] text-white/60">Started {relativeTime(liveClass.sessionStartedAt)}</span>
              </div>
              <Link to={`/student/live-classes/${liveClass.id}/room`} className="btn btn-sky btn-sm mt-4">
                Join classroom <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : nextClass ? (
            <>
              <h3 className="text-[15px] font-medium leading-snug text-ink">{nextClass.title}</h3>
              <p className="mt-1 text-[11.5px] text-muted">
                {nextClass.faculty?.name} · {formatDayLabel(nextClass.scheduledStartAt)} at {formatTime(nextClass.scheduledStartAt)}
              </p>
              <Link to={`/student/live-classes/${nextClass.id}`} className="btn btn-secondary btn-sm mt-3">
                Class details
              </Link>
            </>
          ) : (
            <EmptyState compact icon={Video} title="No live class scheduled" description="Your faculty schedule will appear here." />
          )}
        </BentoCard>

        <BentoCard className="lg:col-span-4" eyebrow="Quick actions" delay={0.12}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/student/doubts?tab=ai', label: 'Ask AI assistant', icon: Sparkles },
              { to: '/student/doubts?tab=faculty', label: 'Ask faculty', icon: MessageSquare },
              { to: '/student/recordings', label: 'Watch recording', icon: PlayCircle },
              { to: '/student/performance', label: 'Performance', icon: TrendingUp },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex flex-col gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3 transition hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-sm)]"
                >
                  <Icon className="h-4 w-4 text-ink-60 transition group-hover:text-ink" aria-hidden="true" />
                  <span className="text-[11.5px] font-medium leading-snug text-ink">{action.label}</span>
                </Link>
              )
            })}
          </div>
          <p className="mt-3 text-[10.5px] leading-snug text-soft">
            Teaching and doubt tools are demonstration flows backed by local mock records.
          </p>
        </BentoCard>

        <BentoCard
          className="lg:col-span-3"
          eyebrow="Latest result"
          delay={0.14}
          action={
            latestResult ? (
              <Link to={`/student/exams/${latestResult.examId}/result`} className="text-[11px] font-medium text-link hover:underline">
                Open
              </Link>
            ) : null
          }
        >
          {latestResult ? (
            <>
              <p className="stat-figure text-ink">{latestResult.percentage}%</p>
              <p className="mt-1 text-[11.5px] font-medium leading-snug text-ink clamp-2">{latestResult.examTitle}</p>
              <div className="mt-2.5 space-y-1.5 text-[11px] text-muted">
                <p>{latestResult.awardedMarks}/{latestResult.maxMarks} marks · {latestResult.accuracy}% accuracy</p>
                <p>{formatDate(latestResult.submittedAt)}</p>
              </div>
              <ProgressBar value={latestResult.percentage} max={100} className="mt-2.5" height={5} />
            </>
          ) : (
            <EmptyState compact icon={TrendingUp} title="No graded attempt yet" description="Results appear after your first submission." />
          )}
        </BentoCard>
      </div>

      {/* insights, doubts, recordings, timeline */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <BentoCard className="lg:col-span-4" eyebrow="Performance insights" title="Weakest topics" delay={0.16}
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
                  <Link to={`/student/doubts/${doubt.id}`} className="block rounded-[10px] border border-[var(--line)] p-2.5 transition hover:border-[var(--line-strong)]">
                    <p className="text-[11.5px] font-medium leading-snug text-ink clamp-1">{doubt.title}</p>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {doubt.faculty?.name} replied · {relativeTime(doubt.lastActivityAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[var(--surface-sunken)] px-2.5 py-2">
            <MessageSquare className="h-3.5 w-3.5 text-ink-60" aria-hidden="true" />
            <p className="text-[11px] text-muted">
              {pendingDoubts} awaiting a reply · {answeredDoubts.length} with faculty replies
            </p>
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-4" eyebrow="Recordings" title="Recently published" delay={0.2}
          action={<Link to="/student/recordings" className="text-[11px] font-medium text-link hover:underline">Library</Link>}
        >
          {recentRecording ? (
            <Link to={`/student/recordings/${recentRecording.id}`} className="group block">
              <div className="relative overflow-hidden rounded-[12px] border border-[var(--line)]">
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
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.read ? 'bg-[var(--line-strong)]' : 'bg-[var(--ink)]'}`} />
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

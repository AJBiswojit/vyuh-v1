import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Award, Clock, RotateCcw, TrendingDown, TrendingUp, XCircle, MinusCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { analysisService } from '../../services/analysis.service.js'
import { examService } from '../../services/exam.service.js'
import { formatDate, formatTime, formatDuration } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge } from '../../ui/workspace-kit.jsx'
import { ComparisonBars, DonutChart, CHART_TONE } from '../../ui/charts.jsx'

function ScoreDial({ percentage, tone }) {
  const size = 132
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percentage))
  const offset = circumference - (clamped / 100) * circumference
  const color = tone === 'danger' ? CHART_TONE.bad : tone === 'warn' ? CHART_TONE.warn : CHART_TONE.primary
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${percentage} percent`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={CHART_TONE.track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ font: '500 27px Zodiak, Georgia, serif', fill: 'var(--ink)' }}>
        {percentage}%
      </text>
      <text x="50%" y="62%" textAnchor="middle" style={{ font: '500 9.5px Switzer, system-ui, sans-serif', fill: 'var(--ink-45)', letterSpacing: '0.1em' }}>
        SCORE
      </text>
    </svg>
  )
}

export default function ExamResultPage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const submittedMode = searchParams.get('submitted')

  const { data, error, loading, refresh } = useAsync(async () => {
    const exams = await examService.getStudentExams(user.id)
    const all = [...exams.upcoming, ...exams.inProgress, ...exams.completed, ...exams.missed]
    const match = all.find((exam) => exam.id === examId)
    const attemptId = match?.attempt?.id
    if (!attemptId) {
      const payload = await examService.getExamForStudent(examId, user.id)
      return { noAttempt: true, exam: payload.exam }
    }
    const [summary, examPayload] = await Promise.all([
      analysisService.getResultSummary(attemptId),
      examService.getExamForStudent(examId, user.id),
    ])
    return { summary, exam: examPayload.exam, attemptId }
  }, [examId, user.id])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Examination result" title="Loading result" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Examination result" title="Result" backTo="/student/exams" backLabel="All examinations" />
        <ErrorState error={error} onRetry={refresh} title="This result could not be loaded" />
      </div>
    )
  }

  if (data.noAttempt) {
    return (
      <div>
        <PageHeader eyebrow="Examination result" title={data.exam.title} backTo="/student/exams" backLabel="All examinations" />
        <div className="surface p-6">
          <p className="text-[13px] text-ink">No attempt has been recorded for this examination.</p>
          <p className="mt-1 text-[12px] text-muted">
            The result appears here after you submit the paper. If the window is still open you can start the attempt.
          </p>
          <Link to={`/student/exams/${examId}/instructions`} className="btn btn-primary btn-sm mt-4">
            Open instructions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  const { summary, exam } = data
  const { totals, subjectBreakdown, attempt } = summary
  const tone = totals.percentage >= 60 ? 'good' : totals.percentage >= 35 ? 'warn' : 'danger'
  const isExpired = attempt.status === 'expired'

  const breakdown = [
    { name: 'Correct', value: totals.correctCount, color: CHART_TONE.good },
    { name: 'Incorrect', value: totals.incorrectCount, color: CHART_TONE.bad },
    { name: 'Unattempted', value: totals.unattemptedCount, color: CHART_TONE.track },
  ].filter((entry) => entry.value > 0)

  return (
    <div>
      <PageHeader
        eyebrow="Examination result"
        title={exam.title}
        description={`${exam.type} · submitted ${formatDate(attempt.submittedAt)} at ${formatTime(attempt.submittedAt)} · ${isExpired ? 'auto-submitted when the timer expired' : 'submitted manually'}`}
        backTo="/student/exams"
        backLabel="All examinations"
        actions={
          <>
            <StatusBadge tone={isExpired ? 'warn' : 'good'} dot>
              {isExpired ? 'Auto-submitted' : 'Submitted'}
            </StatusBadge>
            <Link to={`/student/exams/${examId}/analysis`} className="btn btn-primary btn-sm">
              Detailed analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {submittedMode ? (
        <div className="mb-4 rounded-[14px] border border-[#cfe0c9] bg-[#eef5ec] px-4 py-3">
          <p className="text-[12px] font-medium text-[#2f532c]">
            {submittedMode === 'auto'
              ? 'Time expired — your attempt was submitted automatically with the responses saved at that moment.'
              : 'Your attempt was submitted successfully. Every figure below is generated from your saved responses.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="surface flex items-center gap-5 p-5 lg:col-span-4">
          <ScoreDial percentage={totals.percentage} tone={tone} />
          <div className="min-w-0">
            <p className="label-xs">Marks obtained</p>
            <p className="stat-figure mt-1 text-ink">
              {totals.awardedMarks}
              <span className="ml-1 text-[14px] font-normal tracking-normal text-soft">/ {totals.maxMarks}</span>
            </p>
            <dl className="mt-2.5 space-y-1 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Accuracy</dt>
                <dd className="font-medium tabular text-ink">{totals.accuracy}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Attempted</dt>
                <dd className="font-medium tabular text-ink">{totals.answeredCount}/{totals.totalQuestions}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Negative marks</dt>
                <dd className="font-medium tabular text-[#8c2f2f]">−{totals.negativeTotal}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:col-span-8 lg:grid-cols-4">
          {[
            { label: 'Correct', value: totals.correctCount, icon: Award, tone: 'text-[#375f34]' },
            { label: 'Incorrect', value: totals.incorrectCount, icon: XCircle, tone: 'text-[#8c2f2f]' },
            { label: 'Unattempted', value: totals.unattemptedCount, icon: MinusCircle, tone: 'text-ink-60' },
            { label: 'Partial credit', value: totals.partialCount, icon: TrendingUp, tone: 'text-link' },
            { label: 'Total time', value: formatDuration(totals.totalTimeSpent), icon: Clock, tone: 'text-ink' },
            { label: 'Avg / question', value: `${totals.averageTimePerQuestion}s`, icon: Clock, tone: 'text-ink' },
            { label: 'Answer changes', value: attempt.answerChangeHistory.length, icon: RotateCcw, tone: 'text-ink' },
            { label: 'Marked for review', value: attempt.markedForReview.length, icon: TrendingDown, tone: 'text-ink' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="surface-flat p-3.5">
                <Icon className={`h-3.5 w-3.5 ${stat.tone}`} aria-hidden="true" />
                <p className="mt-2 text-[17px] font-medium leading-none tabular text-ink">{stat.value}</p>
                <p className="mt-1 text-[10.5px] uppercase tracking-wide text-soft">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
          <h2 className="text-[13.5px] font-medium text-ink">Response distribution</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {totals.totalQuestions} questions · {exam.negativeMarking ? 'negative marking applied' : 'no negative marking'}
          </p>
          <DonutChart data={breakdown} height={186} innerRadius={50} outerRadius={72} centerValue={`${totals.answeredCount}`} centerLabel="attempted" />
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {breakdown.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} aria-hidden="true" />
                {entry.name} · {entry.value}
              </span>
            ))}
          </div>
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
          <h2 className="text-[13.5px] font-medium text-ink">Subject breakdown</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">Marks and accuracy computed per subject from the saved responses.</p>
          <div className="mt-3">
            <ComparisonBars
              data={subjectBreakdown.map((bucket) => ({
                name: bucket.subjectName,
                percentage: Math.max(bucket.percentage, 0),
                accuracy: bucket.accuracy,
              }))}
              series={[
                { key: 'percentage', name: 'Score %' },
                { key: 'accuracy', name: 'Accuracy %', color: '#aed9f0' },
              ]}
              height={186}
              unit="%"
            />
          </div>
          <div className="mt-3 space-y-2">
            {subjectBreakdown.map((bucket) => (
              <div key={bucket.subjectId}>
                <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                  <span className="font-medium text-ink">{bucket.subjectName}</span>
                  <span className="tabular text-muted">
                    {bucket.marksAwarded}/{bucket.maxMarks} marks · {bucket.correct} correct · {bucket.timeSpent}s
                  </span>
                </div>
                <ProgressBar
                  value={Math.max(bucket.percentage, 0)}
                  tone={bucket.percentage >= 60 ? 'good' : bucket.percentage >= 35 ? 'warn' : 'danger'}
                  height={4}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-white p-4">
        <div>
          <p className="text-[12.5px] font-medium text-ink">What next?</p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            The detailed analysis shows every question with your response, the correct answer and a step-by-step explanation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/student/exams/${examId}/analysis`} className="btn btn-primary btn-sm">
            Open question-level analysis <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/student/performance" className="btn btn-secondary btn-sm">
            Performance trends
          </Link>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenCheck,
  Info,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { performanceService } from '../../services/performance.service.js'
import { analysisService } from '../../services/analysis.service.js'
import { formatDate, formatDuration, formatMinutes } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge } from '../../ui/workspace-kit.jsx'
import { ComparisonBars, DonutChart, MultiLine, CHART_TONE } from '../../ui/charts.jsx'
import Button from '../../ui/Button.jsx'

const DISTRIBUTION_COLORS = {
  good: CHART_TONE.good,
  bad: CHART_TONE.bad,
  track: CHART_TONE.track,
  cream: CHART_TONE.cream,
}

function Delta({ value, unit = '', positiveIsGood = true }) {
  const numeric = Number(value) || 0
  const flat = Math.abs(numeric) < 0.05
  const good = positiveIsGood ? numeric > 0 : numeric < 0
  const Icon = flat ? Minus : numeric > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-medium ${flat ? 'text-soft' : good ? 'text-[var(--good-800)]' : 'text-[var(--bad-700)]'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {flat ? 'No change' : `${numeric > 0 ? '+' : ''}${numeric}${unit}`}
    </span>
  )
}

function TopicIndicator({ topic }) {
  const tone = topic.strength === 'strong' ? 'good' : topic.strength === 'developing' ? 'warn' : 'danger'
  return (
    <div className="rounded-[10px] border border-[var(--line)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-medium text-ink">{topic.topicName}</p>
          <p className="mt-0.5 text-[10px] text-soft">{topic.subjectName} · {topic.attempts} appearance{topic.attempts === 1 ? '' : 's'}</p>
        </div>
        <StatusBadge tone={tone}>{topic.strengthLabel}</StatusBadge>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <ProgressBar value={topic.accuracy} tone={tone} height={5} className="flex-1" />
        <span className="shrink-0 text-[10.5px] font-medium tabular text-ink">{topic.accuracy}%</span>
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const { user } = useAuth()
  const [view, setView] = useState('overview')
  const [selectedAttemptId, setSelectedAttemptId] = useState(null)

  const performance = useAsync(() => performanceService.getStudentPerformance(user.id), [user.id])
  const resolvedAttemptId = selectedAttemptId || performance.data?.academic?.points?.[0]?.attemptId || null
  const analysis = useAsync(
    () => view === 'exam-analysis' && resolvedAttemptId
      ? analysisService.getDetailedAnalysis(resolvedAttemptId)
      : Promise.resolve(null),
    [view, resolvedAttemptId],
  )

  const trendData = useMemo(() => {
    if (!performance.data) return []
    return [...performance.data.academic.points]
      .reverse()
      .map((point, index) => ({
        label: `T${index + 1}`,
        tooltipLabel: `${point.examTitle} · ${formatDate(point.submittedAt)}`,
        percentage: Math.max(point.percentage, 0),
        accuracy: point.accuracy,
      }))
  }, [performance.data])

  const openAnalysis = (attemptId) => {
    setSelectedAttemptId(attemptId)
    setView('exam-analysis')
  }

  if (performance.loading && !performance.data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Performance" />
        <LoadingBlock rows={8} />
      </div>
    )
  }

  if (performance.error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Performance" />
        <ErrorState error={performance.error} onRetry={performance.refresh} title="Performance data could not be loaded" />
      </div>
    )
  }

  const data = performance.data
  const { overview, academic, participation, notes } = data
  const points = academic.points || []
  const distributionData = overview.distribution.map((entry) => ({
    ...entry,
    color: DISTRIBUTION_COLORS[entry.colorKey] || CHART_TONE.sky,
  }))

  const tabs = (
    <div className="tab-row mb-4" role="tablist" aria-label="Performance views">
      <button type="button" role="tab" aria-selected={view === 'overview'} className="tab" onClick={() => setView('overview')}>
        Overview
      </button>
      <button type="button" role="tab" aria-selected={view === 'exam-analysis'} className="tab" onClick={() => setView('exam-analysis')}>
        Examination analysis
      </button>
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Performance"
        description="Academic results, exam-wise analysis and participation are kept separate. Every academic figure comes from graded attempts and saved responses."
        actions={
          <Button size="sm" variant="secondary" icon={BookOpenCheck} onClick={() => setView('exam-analysis')}>
            Open exam analysis
          </Button>
        }
      />
      {tabs}

      {view === 'exam-analysis' ? (
        <section aria-labelledby="exam-analysis-heading">
          <div className="surface-sky mb-4 flex flex-wrap items-end justify-between gap-3 p-4">
            <div>
              <p className="page-eyebrow">Detailed examination analysis</p>
              <h2 id="exam-analysis-heading" className="mt-1 text-[15px] font-medium text-[var(--sky-900)]">One attempt at a time</h2>
              <p className="mt-0.5 text-[11px] text-[var(--sky-800)]">Summary, subject sections, topic strengths and recommendations. Question-level detail remains on the full analysis page.</p>
            </div>
            <label className="min-w-[240px]">
              <span className="field-label">Select attempt</span>
              <select
                className="field-select mt-1"
                value={resolvedAttemptId || ''}
                onChange={(event) => setSelectedAttemptId(event.target.value)}
                aria-label="Select examination attempt"
              >
                {points.map((point) => (
                  <option key={point.attemptId} value={point.attemptId}>
                    {point.examTitle} · {formatDate(point.submittedAt)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {analysis.loading && !analysis.data ? <LoadingBlock rows={7} /> : null}
          {analysis.error ? (
            <ErrorState error={analysis.error} onRetry={analysis.refresh} title="Examination analysis could not be loaded" />
          ) : null}
          {!analysis.loading && !analysis.error && !analysis.data ? (
            <div className="surface-flat"><EmptyState compact icon={BookOpenCheck} title="No attempt selected" description="Submit an examination to unlock detailed analysis." /></div>
          ) : null}

          {analysis.data ? (
            <div className="space-y-4">
              <section className="surface-deep p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="label-xs !text-white/70">Level A · attempt summary</p>
                    <h3 className="mt-1 text-[17px] font-medium leading-snug text-white">{analysis.data.exam.title}</h3>
                    <p className="mt-0.5 text-[11px] text-white/70">
                      {analysis.data.exam.type} · {formatDuration(analysis.data.attempt.totalTimeSpent)} spent · submitted {formatDate(analysis.data.attempt.submittedAt)}
                    </p>
                  </div>
                  <Link
                    to={`/student/exams/${analysis.data.exam.id}/analysis`}
                    className="btn btn-sky btn-sm"
                  >
                    Question-level analysis <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: 'Score', value: `${Math.max(analysis.data.levelA.percentage, 0)}%` },
                    { label: 'Marks', value: `${analysis.data.levelA.awardedMarks}/${analysis.data.levelA.maxMarks}` },
                    { label: 'Accuracy', value: `${analysis.data.levelA.accuracy}%` },
                    { label: 'Correct', value: analysis.data.levelA.correctCount },
                    { label: 'Incorrect', value: analysis.data.levelA.incorrectCount },
                    { label: 'Unattempted', value: analysis.data.levelA.unattemptedCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[10px] border border-white/20 bg-white/10 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-[0.1em] text-white/65">{item.label}</p>
                      <p className="mt-0.5 text-[14px] font-medium tabular text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-white/75">
                  Pace: {formatMinutes(analysis.data.levelA.averageTimePerQuestion / 60)} ({analysis.data.levelA.averageTimePerQuestion}s) per question · negative marks {analysis.data.levelA.negativeTotal} · partial {analysis.data.levelA.partialCount}.
                </p>
              </section>

              <div className="grid gap-4 lg:grid-cols-12">
                <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
                  <h3 className="text-[13px] font-medium text-ink">Subject and section breakdown</h3>
                  <div className="table-scroll mt-3">
                    <table className="data-table">
                      <thead><tr><th>Subject / section</th><th className="align-right">Marks</th><th className="align-right">Score</th><th className="align-right">Correct</th></tr></thead>
                      <tbody>
                        {analysis.data.levelB.map((subject) => (
                          <tr key={subject.subjectId}>
                            <td><span className="font-medium text-ink">{subject.subjectName}</span><span className="block text-[10px] text-soft">{subject.questions} questions · {subject.answered} answered</span></td>
                            <td className="align-right tabular">{subject.marksAwarded}/{subject.maxMarks}</td>
                            <td className="align-right tabular font-medium">{subject.percentage}%</td>
                            <td className="align-right tabular">{subject.correct}</td>
                          </tr>
                        ))}
                        {analysis.data.extras.sectionPerformance.map((section) => (
                          <tr key={section.sectionId}>
                            <td><span className="text-muted">{section.name}</span><span className="block text-[10px] text-soft">Section</span></td>
                            <td className="align-right tabular">{section.awarded}/{section.max}</td>
                            <td className="align-right tabular">{section.percentage}%</td>
                            <td className="align-right tabular">{section.correct}/{section.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="surface-cream p-4 sm:p-5 lg:col-span-5">
                  <h3 className="text-[13px] font-medium text-[var(--cream-900)]">Topic strengths & weaknesses</h3>
                  <div className="mt-3 space-y-2">
                    {[...analysis.data.levelC.weak, ...analysis.data.levelC.strong].slice(0, 6).map((topic) => (
                      <div key={topic.topicId} className="rounded-[10px] border border-[var(--cream-300)] bg-white/70 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11.5px] font-medium text-ink">{topic.topicName}</span>
                          <StatusBadge tone={topic.strength === 'strong' ? 'good' : topic.strength === 'developing' ? 'warn' : 'danger'}>
                            {topic.strength === 'strong' ? 'Strong' : topic.strength === 'developing' ? 'Developing' : 'Weak'}
                          </StatusBadge>
                        </div>
                        <ProgressBar value={topic.accuracy} tone={topic.strength === 'strong' ? 'good' : topic.strength === 'developing' ? 'warn' : 'danger'} height={5} className="mt-1.5" />
                        <p className="mt-1 text-[10px] text-soft">{topic.accuracy}% accuracy · {topic.questions} questions</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <section className="surface-sky p-4 sm:p-5 lg:col-span-7">
                  <h3 className="text-[13px] font-medium text-[var(--sky-900)]">Recommendations from this attempt</h3>
                  <ul className="mt-3 space-y-2">
                    {analysis.data.extras.recommendations.map((recommendation) => (
                      <li key={recommendation.id} className="rounded-[10px] border border-[var(--sky-200)] bg-white/80 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11.5px] font-medium text-ink">{recommendation.title}</p>
                          <StatusBadge tone={recommendation.priority === 'high' ? 'warn' : 'neutral'}>{recommendation.priority}</StatusBadge>
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{recommendation.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
                  <h3 className="text-[13px] font-medium text-ink">Time management</h3>
                  <p className="mt-1 text-[12px] font-medium text-ink">{analysis.data.extras.timeInsight.headline}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{analysis.data.extras.timeInsight.body}</p>
                  <div className="mt-3">
                    <ComparisonBars
                      data={analysis.data.extras.timeDistribution.map((item) => ({
                        name: item.name,
                        seconds: item.seconds / 60,
                        tooltipLabel: `${item.name} · ${formatMinutes(item.seconds / 60)} (${item.seconds}s)`,
                      }))}
                      series={[{ key: 'seconds', name: 'Minutes per question', color: CHART_TONE.cream }]}
                      unit=" min"
                      height={180}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-soft">Question-level explanations, answer changes and per-question status remain on the full analysis page.</p>
                </section>
              </div>
            </div>
          ) : null}
        </section>
      ) : overview.summary.attempts === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={TrendingUp}
            title="No graded attempts yet"
            description="Attempt an examination and this page fills with trends, subject comparisons and topic-level accuracy from your saved responses."
          />
        </div>
      ) : (
        <>
          <section aria-labelledby="academic-summary-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="academic-summary-heading" className="display-md text-ink">Academic summary</h2>
              <StatusBadge tone="neutral">Derived from {overview.attempts} graded attempt{overview.attempts === 1 ? '' : 's'}</StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Average score', value: `${overview.summary.averagePercentage}%`, hint: `Best ${overview.summary.bestPercentage}% · marks-based` },
                { label: 'Average accuracy', value: `${overview.summary.averageAccuracy}%`, hint: 'Correct of answered questions' },
                { label: 'Average pace', value: formatMinutes(overview.summary.averageTimePerQuestion / 60), hint: `${overview.summary.averageTimePerQuestion}s per question` },
                { label: 'Response counts', value: `${overview.totals.correct}/${overview.totals.answered}`, hint: `${overview.totals.incorrect} incorrect · ${overview.totals.unattempted} unattempted` },
              ].map((stat, index) => (
                <div key={stat.label} className="stat-tile" data-tone={index === 0 ? 'deep' : index === 1 ? 'sky' : index === 2 ? 'cream' : undefined}>
                  <p className={`label-xs ${index === 0 ? '!text-white/70' : ''}`}>{stat.label}</p>
                  <p className={`stat-figure mt-1.5 ${index === 0 ? 'text-white' : 'text-ink'}`}>{stat.value}</p>
                  <p className={`stat-tile-hint ${index === 0 ? '!text-white/70' : ''}`}>{stat.hint}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-sky mt-4 p-4 sm:p-5" aria-labelledby="recent-comparison-heading">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="page-eyebrow">Recent exam comparison</p>
                <h2 id="recent-comparison-heading" className="mt-1 text-[14px] font-medium text-[var(--sky-900)]">Latest attempt vs previous attempt</h2>
              </div>
              {overview.comparison ? (
                <StatusBadge tone={overview.comparison.deltas.score >= 0 ? 'good' : 'warn'}>
                  {overview.comparison.deltas.score >= 0 ? 'Score improving' : 'Score declining'}
                </StatusBadge>
              ) : null}
            </div>
            {overview.comparison ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Score', latest: `${overview.comparison.latest.percentage}%`, previous: `${overview.comparison.previous.percentage}%`, delta: overview.comparison.deltas.score, unit: ' pts' },
                  { label: 'Accuracy', latest: `${overview.comparison.latest.accuracy}%`, previous: `${overview.comparison.previous.accuracy}%`, delta: overview.comparison.deltas.accuracy, unit: ' pts' },
                  { label: 'Pace', latest: formatMinutes(overview.comparison.latest.averageTimePerQuestion / 60), previous: formatMinutes(overview.comparison.previous.averageTimePerQuestion / 60), delta: overview.comparison.deltas.pace, unit: 's', positiveIsGood: false },
                  { label: 'Unattempted', latest: overview.comparison.latest.unattemptedCount, previous: overview.comparison.previous.unattemptedCount, delta: overview.comparison.deltas.unattempted, unit: '', positiveIsGood: false },
                ].map((item) => (
                  <div key={item.label} className="rounded-[10px] border border-[var(--sky-200)] bg-white/85 p-2.5">
                    <p className="label-xs">{item.label}</p>
                    <p className="mt-1 text-[15px] font-medium tabular text-ink">{item.latest}</p>
                    <p className="mt-0.5 text-[10px] text-soft">Previous {item.previous}</p>
                    <div className="mt-1"><Delta value={item.delta} unit={item.unit} positiveIsGood={item.positiveIsGood ?? true} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState compact icon={TrendingUp} title="One graded attempt so far" description="A second submitted attempt is needed for a meaningful recent-exam comparison." />
            )}
            {overview.comparison ? (
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--sky-800)]">
                {overview.comparison.latest.examTitle} ({formatDate(overview.comparison.latest.submittedAt)}) compared with {overview.comparison.previous.examTitle} ({formatDate(overview.comparison.previous.submittedAt)}). Correct {overview.comparison.deltas.correct >= 0 ? '+' : ''}{overview.comparison.deltas.correct}, incorrect {overview.comparison.deltas.incorrect >= 0 ? '+' : ''}{overview.comparison.deltas.incorrect}.
              </p>
            ) : null}
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
              <div className="card-rule" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-ink">Score and accuracy trend</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Chronological across graded attempts. Tooltips show the examination and date.</p>
              <div className="mt-3">
                <MultiLine
                  data={trendData}
                  series={[
                    { key: 'percentage', name: 'Score %', color: CHART_TONE.primary },
                    { key: 'accuracy', name: 'Accuracy %', color: CHART_TONE.sky },
                  ]}
                  height={230}
                  unit="%"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="legend-key" style={{ '--key': CHART_TONE.primary }}>Score % · marks-based</span>
                <span className="legend-key" style={{ '--key': CHART_TONE.sky }}>Accuracy % · correct of answered</span>
              </div>
            </section>

            <section className="surface-cream p-4 sm:p-5 lg:col-span-5">
              <div className="card-rule" data-tone="cream" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-[var(--cream-900)]">Answer distribution</h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--cream-800)]">Across {overview.totals.totalQuestions} graded questions.</p>
              <DonutChart
                data={distributionData}
                height={178}
                innerRadius={48}
                outerRadius={70}
                centerValue={overview.totals.totalQuestions}
                centerLabel="questions"
                tooltipFormatter={(entry) => `${entry.value} question${entry.value === 1 ? '' : 's'} · ${entry.percentage}% of graded questions`}
              />
              <div className="mt-2 space-y-1">
                {distributionData.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="legend-key" style={{ '--key': entry.color }}>{entry.label}</span>
                    <span className="tabular font-medium text-ink">{entry.value} · {entry.percentage}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-sky p-4 sm:p-5 lg:col-span-7">
              <div className="card-rule" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-[var(--sky-900)]">Subject performance & momentum</h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--sky-800)]">Average across papers, with the latest comparable subject delta.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {academic.subjectAverages.map((subject) => {
                  const momentum = overview.subjectMomentum.find((item) => item.subjectId === subject.subjectId)
                  return (
                    <div key={subject.subjectId} className="rounded-[10px] border border-[var(--sky-200)] bg-white/85 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="text-[11.5px] font-medium text-ink">{subject.subjectName}</p><p className="text-[10px] text-soft">{subject.count} paper{subject.count === 1 ? '' : 's'} · best {subject.best}%</p></div>
                        <StatusBadge tone={momentum?.direction === 'improving' ? 'good' : momentum?.direction === 'declining' ? 'warn' : 'neutral'}>
                          {momentum?.direction === 'improving' ? 'Improving' : momentum?.direction === 'declining' ? 'Declining' : momentum?.direction === 'steady' ? 'Steady' : 'Baseline'}
                        </StatusBadge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar value={subject.average} tone={subject.average >= 60 ? 'good' : subject.average >= 35 ? 'warn' : 'danger'} height={5} className="flex-1" />
                        <span className="shrink-0 text-[11px] font-medium tabular text-ink">{subject.average}%</span>
                      </div>
                      <p className="mt-1 text-[10px] text-soft">
                        {momentum?.delta === null || momentum?.delta === undefined
                          ? 'One comparable paper so far'
                          : `Latest subject change ${momentum.delta > 0 ? '+' : ''}${momentum.delta} pts · latest ${momentum.latestPercentage}%`}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
              <div className="card-rule" data-tone="warn" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-ink">Topic strengths & weaknesses</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Indicators use accuracy from saved topic responses.</p>
              <div className="mt-3 space-y-2">
                {[...overview.topicGroups.weak, ...overview.topicGroups.strong].slice(0, 5).map((topic) => (
                  <TopicIndicator key={topic.topicId} topic={topic} />
                ))}
                {overview.topicGroups.developing.length ? (
                  <p className="text-[10px] text-soft">{overview.topicGroups.developing.length} developing topic{overview.topicGroups.developing.length === 1 ? '' : 's'} · see detailed exam analysis for the full list.</p>
                ) : null}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-cream p-4 sm:p-5 lg:col-span-5">
              <div className="card-rule" data-tone="cream" aria-hidden="true" />
              <h2 className="mt-2 flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--cream-900)]">
                <Target className="h-3.5 w-3.5" aria-hidden="true" /> Recommendations
              </h2>
              <ul className="mt-3 space-y-2">
                {overview.recommendations.map((recommendation) => (
                  <li key={recommendation.id} className="rounded-[10px] border border-[var(--cream-300)] bg-white/70 p-2.5">
                    <p className="text-[11.5px] font-medium text-ink">{recommendation.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{recommendation.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface-flat overflow-hidden lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
                <h2 className="text-[13px] font-medium text-ink">Examination history</h2>
                <span className="text-[10px] text-soft">Open detailed analysis per attempt</span>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th className="align-right">Marks</th>
                      <th className="align-right">Score</th>
                      <th className="align-right">Accuracy</th>
                      <th className="align-right">C / I / U</th>
                      <th className="align-right">Pace</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.attemptId}>
                        <td>
                          <p className="max-w-[220px] truncate font-medium text-ink">{point.examTitle}</p>
                          <p className="text-[10.5px] text-soft">{formatDate(point.submittedAt)} · {point.examType}</p>
                        </td>
                        <td className="align-right tabular">{point.awardedMarks}/{point.maxMarks}</td>
                        <td className="align-right tabular font-medium">{Math.max(point.percentage, 0)}%</td>
                        <td className="align-right tabular">{point.accuracy}%</td>
                        <td className="align-right tabular">{point.correctCount}/{point.incorrectCount}/{point.unattemptedCount}</td>
                        <td className="align-right tabular">{formatMinutes(point.averageTimePerQuestion / 60)}</td>
                        <td className="align-right">
                          <button type="button" onClick={() => openAnalysis(point.attemptId)} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-link hover:underline">
                            Analysis <ArrowUpRight className="h-3 w-3" />
                          </button>
                          <Link to={`/student/exams/${point.examId}/analysis`} className="mt-0.5 block text-[10px] text-soft hover:underline">Question level</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="mt-6" aria-labelledby="participation-heading">
            <div className="mb-3 flex items-center gap-2">
              <h2 id="participation-heading" className="display-md text-ink">Participation & engagement</h2>
              <StatusBadge tone="neutral">Not part of academic score</StatusBadge>
            </div>
            <div className="grid gap-4 lg:grid-cols-12">
              <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
                <h3 className="text-[13px] font-medium text-ink">Attendance</h3>
                <DonutChart
                  data={[
                    { name: 'Attended', value: participation.attendance.percentage, color: participation.attendance.percentage >= participation.attendance.threshold ? CHART_TONE.primary : CHART_TONE.warn, percentage: participation.attendance.percentage },
                    { name: 'Missed', value: Math.max(0, 100 - participation.attendance.percentage), color: CHART_TONE.track, percentage: Math.max(0, 100 - participation.attendance.percentage) },
                  ]}
                  height={160}
                  innerRadius={46}
                  outerRadius={66}
                  centerValue={`${participation.attendance.percentage}%`}
                  centerLabel="attended"
                  tooltipFormatter={(entry) => `${entry.percentage}% of eligible class minutes`}
                />
                <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><dt className="label-xs">Attended</dt><dd className="font-medium text-ink">{participation.attendance.attendedHours} h</dd></div>
                  <div><dt className="label-xs">Missed</dt><dd className="font-medium text-ink">{participation.attendance.missingHours} h</dd></div>
                </dl>
                <p className="mt-2 text-[10px] text-soft">{participation.attendance.timingWarnings} timing/threshold warnings · requirement {participation.attendance.threshold}%</p>
                <Link to="/student/attendance" className="btn btn-secondary btn-sm mt-3 w-full">Attendance detail</Link>
              </section>

              <section className="surface-cream p-4 sm:p-5 lg:col-span-4">
                <h3 className="text-[13px] font-medium text-[var(--cream-900)]">Classes</h3>
                <dl className="mt-2 space-y-2 text-[12px]">
                  <div className="flex justify-between"><dt className="text-muted">Sessions in batch</dt><dd className="font-medium text-ink">{participation.classes.liveSessions}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Sessions attended</dt><dd className="font-medium text-ink">{participation.classes.attended}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Upcoming</dt><dd className="font-medium text-ink">{participation.classes.scheduled}</dd></div>
                </dl>
                <p className="mt-3 text-[10.5px] leading-relaxed text-soft">{notes.participationNote}</p>
              </section>

              <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
                <h3 className="text-[13px] font-medium text-ink">Doubt activity</h3>
                <dl className="mt-2 space-y-2 text-[12px]">
                  <div className="flex justify-between"><dt className="text-muted">Doubts raised</dt><dd className="font-medium text-ink">{participation.doubts.total}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Answered by faculty</dt><dd className="font-medium text-ink">{participation.doubts.answered + participation.doubts.resolved}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Still open</dt><dd className="font-medium text-ink">{participation.doubts.open}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Response rate</dt><dd className="font-medium text-ink">{participation.doubts.responseRate}%</dd></div>
                </dl>
                <Link to="/student/doubts" className="btn btn-secondary btn-sm mt-3 w-full">Open doubts</Link>
              </section>
            </div>
          </section>

          <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">
              {overview.sourceNote} {notes.academicNote} {notes.participationNote} Class participation is not combined with examination marks to
              produce a composite academic score.
            </p>
            <Sparkles className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-soft sm:block" aria-hidden="true" />
          </div>
        </>
      )}
    </div>
  )
}

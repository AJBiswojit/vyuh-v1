import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Download, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { analysisService } from '../../services/analysis.service.js'
import { formatDate } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { ComparisonBars, DonutChart } from '../../ui/charts.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

export default function ItemAnalysisPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [examId, setExamId] = useState(null)

  const overview = useAsync(() => analysisService.getItemAnalysisOverview(user.id), [user.id])
  const exams = overview.data || []
  const activeExamId = examId || exams[0]?.examId || exams[0]?.id || null

  const detail = useAsync(
    () => (activeExamId ? analysisService.getItemAnalysis(activeExamId) : Promise.resolve(null)),
    [activeExamId],
  )

  const data = detail.data
  const sortedItems = useMemo(() => {
    if (!data) return { hardest: [], easiest: [] }
    const withAttempts = data.itemRows.filter((row) => row.attempts > 0)
    return {
      hardest: [...withAttempts].sort((a, b) => a.correctPct - b.correctPct).slice(0, 5),
      easiest: [...withAttempts].sort((a, b) => b.correctPct - a.correctPct).slice(0, 5),
    }
  }, [data])

  const exportCsv = () => {
    if (!data) return
    const header = ['#', 'Question', 'Topic', 'Difficulty', 'Correct %', 'Incorrect %', 'Unattempted %', 'Avg time (s)']
    const rows = data.itemRows.map((row) => [
      row.number,
      (row.question?.text || '').replace(/\s+/g, ' ').slice(0, 120),
      row.topicName,
      row.difficulty,
      row.correctPct,
      row.incorrectPct,
      row.unattemptedPct,
      row.avgTime,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `item-analysis-${data.exam.id}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    toast.success('Item analysis exported', `${data.itemRows.length} rows written to CSV.`)
  }

  if (overview.loading) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Item Analysis" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (overview.error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Item Analysis" />
        <ErrorState error={overview.error} onRetry={overview.refresh} title="Item analysis could not be loaded" />
      </div>
    )
  }

  if (exams.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Item Analysis" />
        <div className="surface-flat">
          <EmptyState
            icon={BarChart3}
            title="No graded examinations yet"
            description="Item analysis needs submitted attempts. Publish an examination and once students submit, per-question statistics appear here."
            action={
              <Link to="/faculty/exams" className="btn btn-primary btn-sm">
                Manage examinations
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Item Analysis"
        description="Per-question difficulty, discrimination and time data computed from real submitted attempts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeExamId || ''}
              onChange={(event) => setExamId(event.target.value)}
              className="field-select w-auto"
              aria-label="Select examination"
            >
              {exams.map((exam) => (
                <option key={exam.examId || exam.id} value={exam.examId || exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" icon={Download} onClick={exportCsv} disabled={!data}>
              Export CSV
            </Button>
          </div>
        }
      />

      {detail.loading ? (
        <LoadingBlock rows={6} />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refresh} title="This examination could not be analysed" />
      ) : !data ? (
        <EmptyState icon={BarChart3} title="Nothing to analyse" />
      ) : (
        <>
          <div className="surface-flat p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(data.exam.status)} dot>
                    {statusLabel(data.exam.status)}
                  </StatusBadge>
                  <span className="badge badge-outline">{data.exam.type}</span>
                  <span className="badge badge-outline">{data.exam.durationMinutes} min</span>
                </div>
                <h2 className="mt-1.5 text-[15px] font-medium text-ink">{data.exam.title}</h2>
                <p className="text-[11px] text-muted">
                  {formatDate(data.exam.startAt)} · {data.candidates} submitted attempt{data.candidates === 1 ? '' : 's'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Average', value: data.stats.average },
                  { label: 'Highest', value: data.stats.highest },
                  { label: 'Lowest', value: data.stats.lowest },
                  { label: 'Max marks', value: data.stats.maxMarks },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2 text-center">
                    <p className="label-xs">{stat.label}</p>
                    <p className="mt-0.5 text-[14px] font-medium tabular text-ink">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
              <h2 className="text-[13px] font-medium text-ink">Score distribution</h2>
              <p className="mt-0.5 text-[11px] text-muted">Candidates per score band.</p>
              <div className="mt-2">
                <ComparisonBars
                  data={data.distribution.map((band) => ({ name: band.band, candidates: band.count }))}
                  series={[{ key: 'candidates', name: 'Candidates' }]}
                  height={190}
                />
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-3">
              <h2 className="text-[13px] font-medium text-ink">By difficulty</h2>
              <div className="mt-2 space-y-2.5">
                {data.difficultyBuckets.map((bucket) => (
                  <div key={bucket.difficulty}>
                    <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="font-medium text-ink">{bucket.difficulty}</span>
                      <span className="tabular text-muted">{bucket.correctPct}%</span>
                    </div>
                    <ProgressBar
                      value={bucket.correctPct}
                      height={5}
                      tone={bucket.correctPct >= 60 ? 'good' : bucket.correctPct >= 35 ? 'warn' : 'danger'}
                      className="mt-1"
                    />
                    <p className="mt-0.5 text-[10px] text-soft">{bucket.questions} questions</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
              <h2 className="text-[13px] font-medium text-ink">Topic accuracy</h2>
              <div className="mt-2">
                <DonutChart
                  data={data.topicPerformance.slice(0, 5).map((topic) => ({
                    name: topic.topicName,
                    value: Math.max(topic.accuracy, 0.5),
                  }))}
                  height={190}
                  innerRadius={42}
                  outerRadius={64}
                />
              </div>
              <ul className="mt-1 space-y-0.5">
                {data.topicPerformance.slice(0, 4).map((topic, index) => (
                  <li key={topic.topicId} className="flex items-center justify-between gap-2 text-[10.5px] text-muted">
                    <span className="truncate">
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ['#242729', '#aed9f0', '#8a7a4e', '#6aaed2'][index] }} />
                      {topic.topicName}
                    </span>
                    <span className="tabular">{topic.accuracy}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="surface-flat p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <TrendingDown className="h-3.5 w-3.5 text-[#8c2f2f]" aria-hidden="true" /> Hardest questions
              </h2>
              <ul className="mt-2 space-y-1.5">
                {sortedItems.hardest.map((row) => (
                  <li key={row.questionId} className="flex items-start justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] text-ink">
                        Q{row.number} · {row.question?.text}
                      </p>
                      <p className="text-[10px] text-soft">
                        {row.topicName} · {row.difficulty}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium tabular text-[#8c2f2f]">{row.correctPct}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface-flat p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <TrendingUp className="h-3.5 w-3.5 text-[#375f34]" aria-hidden="true" /> Best answered
              </h2>
              <ul className="mt-2 space-y-1.5">
                {sortedItems.easiest.map((row) => (
                  <li key={row.questionId} className="flex items-start justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] text-ink">
                        Q{row.number} · {row.question?.text}
                      </p>
                      <p className="text-[10px] text-soft">
                        {row.topicName} · {row.difficulty}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium tabular text-[#375f34]">{row.correctPct}%</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="surface-flat mt-4 overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-2.5">
              <h2 className="text-[13px] font-medium text-ink">Question-level statistics</h2>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Topic</th>
                    <th>Difficulty</th>
                    <th className="align-right">Correct %</th>
                    <th className="align-right">Skipped %</th>
                    <th className="align-right">Avg time</th>
                    <th>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itemRows.map((row) => (
                    <tr key={row.questionId}>
                      <td className="tabular">{row.number}</td>
                      <td>
                        <p className="max-w-[320px] truncate text-ink">{row.question?.text || row.questionId}</p>
                      </td>
                      <td className="text-[11px] text-muted">{row.topicName}</td>
                      <td>
                        <span className={`badge ${row.difficulty === 'Hard' ? 'badge-warn' : row.difficulty === 'Easy' ? 'badge-good' : 'badge-outline'}`}>
                          {row.difficulty}
                        </span>
                      </td>
                      <td className="align-right tabular">{row.correctPct}%</td>
                      <td className="align-right tabular">{row.unattemptedPct}%</td>
                      <td className="align-right tabular">{row.avgTime}s</td>
                      <td>{row.needsReview ? <StatusBadge tone="warn">Review</StatusBadge> : <span className="text-[10px] text-soft">OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            <p className="text-[10.5px] leading-relaxed text-muted">
              Percentages are computed against the number of submitted attempts. A question is flagged when fewer than half
              of the candidates answered it correctly — useful for rewording, not evidence of a teaching failure.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

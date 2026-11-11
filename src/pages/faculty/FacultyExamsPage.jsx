import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Copy, Plus, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import { formatDate, formatTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

export default function FacultyExamsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const { data, error, loading, refresh } = useAsync(() => examService.getFacultyExams(user.id), [user.id])

  const exams = data || []
  const visible = useMemo(() => {
    let rows = tab === 'all' ? exams : exams.filter((exam) => exam.status === tab)
    const needle = search.trim().toLowerCase()
    if (needle) rows = rows.filter((exam) => exam.title.toLowerCase().includes(needle))
    return rows
  }, [exams, tab, search])

  const counts = useMemo(() => {
    const base = { all: exams.length }
    exams.forEach((exam) => {
      base[exam.status] = (base[exam.status] || 0) + 1
    })
    return base
  }, [exams])

  const duplicate = async (exam) => {
    try {
      const copy = await examService.createExam(
        {
          title: `${exam.title} (copy)`,
          description: exam.description,
          type: exam.type,
          subjectId: exam.subjectId,
          batchIds: exam.batchIds,
          startAt: new Date(exam.startAt).toISOString(),
          endAt: new Date(exam.endAt).toISOString(),
          durationMinutes: exam.durationMinutes,
          sections: (exam.sections || []).map((section) => ({
            name: section.name,
            subjectId: section.subjectId,
            instructions: section.instructions,
            questionIds: [...section.questionIds],
          })),
          negativeMarking: exam.negativeMarking,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleOptions: exam.shuffleOptions,
          resultVisibility: exam.resultVisibility,
          allowLateJoin: exam.allowLateJoin,
          status: 'draft',
        },
        { id: user.id, role: 'faculty', name: user.name },
      )
      toast.success('Examination duplicated', `${copy.title} is saved as a draft.`)
      refresh()
    } catch (caught) {
      toast.error('Could not duplicate', caught?.message)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Examinations" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Examinations" />
        <ErrorState error={error} onRetry={refresh} title="Examinations could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Examinations"
        description="Create a paper, publish it, and watch the attempts flow in. Marks derive from each question's marking scheme."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/faculty/exams/new" className="btn btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" /> New examination
            </Link>
          </div>
        }
      />

      <div className="surface-flat mb-4 flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="tab-row border-0" role="tablist" aria-label="Examination status">
          {[
            { id: 'all', label: 'All' },
            { id: 'draft', label: 'Drafts' },
            { id: 'pending-approval', label: 'Awaiting approval' },
            { id: 'published', label: 'Published' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className="tab"
              onClick={() => setTab(item.id)}
            >
              {item.label} <span className="ml-1 text-[10px] text-soft">{counts[item.id] || 0}</span>
            </button>
          ))}
        </div>
        <div className="relative w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field-input pl-8"
            placeholder="Search title…"
            aria-label="Search examinations"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={ClipboardList}
            title="Nothing here yet"
            description="Create an examination from the question bank: set the window, choose sections and publish when the paper is ready."
            action={
              <Link to="/faculty/exams/new" className="btn btn-primary btn-sm">
                New examination
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((exam) => (
            <article key={exam.id} className="surface-flat p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(exam.status)} dot>
                      {statusLabel(exam.status)}
                    </StatusBadge>
                    <span className="badge badge-outline">{exam.type}</span>
                    <span className="badge badge-outline">{exam.durationMinutes} min</span>
                    <span className="badge badge-outline">
                      {exam.totalQuestions} Q · {exam.totalMarks} marks
                    </span>
                    {exam.negativeMarking ? <span className="badge badge-warn">Negative marking</span> : null}
                  </div>
                  <h3 className="mt-1.5 text-[13.5px] font-medium text-ink">{exam.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{exam.description}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-soft">
                    <span>
                      {formatDate(exam.startAt)} · {formatTime(exam.startAt)} – {formatTime(exam.endAt)}
                    </span>
                    <span>{exam.batches?.map((batch) => batch.name).join(', ')}</span>
                    <span>{exam.windowState || exam.status}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Link to={`/faculty/exams/${exam.id}`} className="btn btn-secondary btn-sm">
                    Open
                  </Link>
                  {['draft', 'scheduled', 'pending-approval'].includes(exam.status) ? (
                    <Link to={`/faculty/exams/${exam.id}/edit`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                  ) : null}
                  {['published', 'completed'].includes(exam.status) ? (
                    <Link to={`/faculty/item-analysis?examId=${exam.id}`} className="btn btn-ghost btn-sm">
                      Analysis
                    </Link>
                  ) : null}
                  <Button size="sm" variant="ghost" icon={Copy} onClick={() => duplicate(exam)}>
                    Duplicate
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-soft">
        Published papers are locked so candidates see a stable paper. This list shows the examinations created by your
        account; administrative views cover the whole institute.
      </p>
    </div>
  )
}

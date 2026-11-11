import { useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { questionService, QUESTION_DIFFICULTIES, QUESTION_TYPES } from '../../services/question.service.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

const TYPE_LABEL = {
  single: 'Single correct',
  multiple: 'Multiple correct',
  numerical: 'Numerical',
}

const BLANK_OPTIONS = [
  { id: 'A', text: '' },
  { id: 'B', text: '' },
  { id: 'C', text: '' },
  { id: 'D', text: '' },
]

function QuestionPreview({ question }) {
  if (!question) return null
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone="sky">{question.subjectName}</StatusBadge>
        <span className="badge badge-outline">{question.topicName}</span>
        <span className="badge badge-outline">{question.difficulty}</span>
        <span className="badge badge-outline">{TYPE_LABEL[question.type] || question.type}</span>
        <span className="badge badge-outline">+{question.marks} / −{question.negativeMarks}</span>
      </div>
      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink">{question.text}</p>
      {question.type === 'numerical' ? (
        <p className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2 text-[11.5px] text-ink-80">
          Numerical answer: <span className="font-medium text-ink">{String(question.correctAnswer)}</span>
        </p>
      ) : (
        <ul className="space-y-1">
          {(question.options || []).map((option) => {
            const correct = (question.correctAnswer || []).includes(option.id)
            return (
              <li
                key={option.id}
                className={`flex items-start gap-2 rounded-[8px] border px-2.5 py-1.5 text-[11.5px] ${
                  correct ? 'border-[#b9d5b1] bg-[#f2f8f0] text-[#2f532c]' : 'border-[var(--line)] text-ink-80'
                }`}
              >
                <span className="font-semibold">{option.id}</span>
                <span>{option.text}</span>
                {correct ? <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
              </li>
            )
          })}
        </ul>
      )}
      <div className="rounded-[8px] border border-[var(--line)] bg-white p-2.5">
        <p className="label-xs">Explanation shown in analysis</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{question.explanation}</p>
      </div>
      {question.usedInExams?.length ? (
        <p className="text-[10.5px] text-soft">
          Used in {question.usedInExams.length} examination{question.usedInExams.length === 1 ? '' : 's'} ·{' '}
          {question.usedInExams.map((exam) => exam.title).join(', ')}
        </p>
      ) : (
        <p className="text-[10.5px] text-soft">Not yet used in any examination.</p>
      )}
    </div>
  )
}

export default function QuestionBankPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()

  const [filters, setFilters] = useState({ subjectId: 'all', topicId: 'all', difficulty: 'all', type: 'all', search: '' })
  const [selected, setSelected] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    subjectId: SUBJECTS[0].id,
    topicId: SUBJECTS[0].topics[0].id,
    difficulty: 'Medium',
    type: 'single',
    marks: 4,
    negativeMarks: 1,
    text: '',
    options: BLANK_OPTIONS,
    correctAnswer: [],
    numericalAnswer: '',
    explanation: '',
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data, error, loading, refresh } = useAsync(
    () =>
      questionService.listQuestions({
        subjectId: filters.subjectId,
        topicId: filters.topicId,
        difficulty: filters.difficulty,
        type: filters.type,
        search: filters.search,
        pageSize: 200,
      }),
    [filters.subjectId, filters.topicId, filters.difficulty, filters.type, filters.search],
  )

  const activeSubject = useMemo(() => SUBJECTS.find((subject) => subject.id === form.subjectId) || SUBJECTS[0], [form.subjectId])
  const topics = useMemo(
    () => (filters.subjectId === 'all' ? SUBJECTS.flatMap((subject) => subject.topics) : SUBJECTS.find((s) => s.id === filters.subjectId)?.topics || []),
    [filters.subjectId],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({
      subjectId: SUBJECTS[0].id,
      topicId: SUBJECTS[0].topics[0].id,
      difficulty: 'Medium',
      type: 'single',
      marks: 4,
      negativeMarks: 1,
      text: '',
      options: BLANK_OPTIONS,
      correctAnswer: [],
      numericalAnswer: '',
      explanation: '',
    })
    setErrors({})
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (question) => {
    setEditing(question)
    setForm({
      subjectId: question.subjectId,
      topicId: question.topicId,
      difficulty: question.difficulty,
      type: question.type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      text: question.text,
      options: question.options?.length ? question.options : BLANK_OPTIONS,
      correctAnswer: Array.isArray(question.correctAnswer) ? question.correctAnswer : [],
      numericalAnswer: question.type === 'numerical' ? String(question.correctAnswer ?? '') : '',
      explanation: question.explanation,
    })
    setErrors({})
    setFormError(null)
    setEditorOpen(true)
  }

  const validate = () => {
    const next = {}
    if (String(form.text).trim().length < 15) next.text = 'Question text must be at least 15 characters.'
    if (String(form.explanation).trim().length < 20) next.explanation = 'Explanation must be at least 20 characters.'
    if (!(Number(form.marks) > 0)) next.marks = 'Marks must be greater than zero.'
    if (Number(form.negativeMarks) < 0) next.negativeMarks = 'Negative marks cannot be negative.'
    if (form.type === 'numerical') {
      if (form.numericalAnswer === '' || Number.isNaN(Number(form.numericalAnswer))) {
        next.correctAnswer = 'Enter a numerical answer.'
      }
    } else {
      const filled = form.options.filter((option) => String(option.text).trim().length > 0)
      if (filled.length < 2) next.options = 'Provide at least two answer options.'
      if (!form.correctAnswer.length) next.correctAnswer = 'Mark the correct option.'
      if (form.type === 'single' && form.correctAnswer.length > 1) next.correctAnswer = 'A single-correct question needs exactly one answer.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSaving(true)
    const payload = {
      subjectId: form.subjectId,
      topicId: form.topicId,
      difficulty: form.difficulty,
      type: form.type,
      marks: Number(form.marks),
      negativeMarks: Number(form.negativeMarks),
      text: form.text.trim(),
      explanation: form.explanation.trim(),
      options: form.type === 'numerical' ? [] : form.options.filter((option) => String(option.text).trim().length > 0),
      correctAnswer: form.type === 'numerical' ? Number(form.numericalAnswer) : form.correctAnswer,
    }
    try {
      if (editing) {
        await questionService.updateQuestion(editing.id, payload, { id: user.id, role: 'faculty', name: user.name })
        toast.success('Question updated', 'Students see the new version the next time an examination uses it.')
      } else {
        await questionService.createQuestion(payload, { id: user.id, role: 'faculty', name: user.name })
        toast.success('Question added', 'It is now available in the examination builder.')
      }
      setEditorOpen(false)
      refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The question could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const duplicate = async (question) => {
    try {
      await questionService.duplicateQuestion(question.id, { id: user.id, role: 'faculty', name: user.name })
      toast.success('Question duplicated', 'The copy is saved as a draft you can edit.')
      refresh()
    } catch (caught) {
      toast.error('Could not duplicate', caught?.message)
    }
  }

  const remove = async (question) => {
    const ok = await confirm({
      title: 'Delete this question?',
      description: question.hasAttemptedUsage
        ? 'This question has been attempted in a graded examination. Deleting it would break historical results, so archive it instead.'
        : 'The question is removed from the bank. This cannot be undone.',
      confirmLabel: question.hasAttemptedUsage ? 'Archive instead' : 'Delete question',
      tone: 'danger',
    })
    if (!ok) return
    try {
      if (question.hasAttemptedUsage) {
        await questionService.archiveQuestion(question.id, { id: user.id, role: 'faculty', name: user.name })
        toast.info('Question archived', 'Historical attempts keep their record.')
      } else {
        await questionService.deleteQuestion(question.id, { id: user.id, role: 'faculty', name: user.name })
        toast.success('Question deleted')
      }
      setSelected(null)
      refresh()
    } catch (caught) {
      toast.error('Action failed', caught?.message)
    }
  }

  const questions = data?.items || []

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Question Bank"
        description="Every question carries its subject, topic, difficulty, marking and explanation — the analysis pages read these directly."
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={openCreate}>
            New question
          </Button>
        }
      />

      <div className="surface-flat mb-4 flex flex-wrap items-end gap-2 p-3">
        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search by text or question ID…"
            className="field-input pl-8"
            aria-label="Search questions"
          />
        </div>
        <select
          value={filters.subjectId}
          onChange={(event) => setFilters((current) => ({ ...current, subjectId: event.target.value, topicId: 'all' }))}
          className="field-select w-auto"
          aria-label="Filter by subject"
        >
          <option value="all">All subjects</option>
          {SUBJECTS.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          value={filters.topicId}
          onChange={(event) => setFilters((current) => ({ ...current, topicId: event.target.value }))}
          className="field-select w-auto"
          aria-label="Filter by topic"
        >
          <option value="all">All topics</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}
          className="field-select w-auto"
          aria-label="Filter by difficulty"
        >
          <option value="all">Any difficulty</option>
          {QUESTION_DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          className="field-select w-auto"
          aria-label="Filter by type"
        >
          <option value="all">Any type</option>
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABEL[type] || type}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="ghost"
          icon={Filter}
          onClick={() => setFilters({ subjectId: 'all', topicId: 'all', difficulty: 'all', type: 'all', search: '' })}
        >
          Reset
        </Button>
      </div>

      {loading ? (
        <LoadingBlock rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="The question bank could not be loaded" />
      ) : questions.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={BookOpen}
            title="No questions match these filters"
            description="Adjust the filters, or add a new question to the bank."
            action={
              <Button size="sm" variant="primary" icon={Plus} onClick={openCreate}>
                New question
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="surface-flat overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
              <p className="text-[11.5px] font-medium text-ink">
                {questions.length} question{questions.length === 1 ? '' : 's'}
              </p>
              <p className="text-[10px] text-soft">Select a row to preview</p>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {questions.map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(question)}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                      selected?.id === question.id ? 'bg-[var(--sky-50)]' : 'hover:bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      <StatusBadge tone={question.status === 'active' ? 'good' : 'neutral'}>{question.status}</StatusBadge>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-ink">{question.text}</span>
                      <span className="mt-0.5 block text-[10px] text-soft">
                        {question.subjectName} · {question.topicName} · {question.difficulty} · {TYPE_LABEL[question.type]}
                        {question.usageCount ? ` · used ${question.usageCount}×` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-soft">{relativeTime(question.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-3">
            {selected ? (
              <div className="surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-medium text-ink">Preview</p>
                  <button type="button" className="icon-btn h-6 w-6" onClick={() => setSelected(null)} aria-label="Close preview">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2">
                  <QuestionPreview question={selected} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-2.5">
                  <Button size="xs" variant="secondary" icon={Pencil} onClick={() => openEdit(selected)}>
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" icon={Copy} onClick={() => duplicate(selected)}>
                    Duplicate
                  </Button>
                  <Button size="xs" variant="ghost" icon={Trash2} onClick={() => remove(selected)}>
                    {selected.hasAttemptedUsage ? 'Archive' : 'Delete'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="surface-flat">
                <EmptyState
                  compact
                  icon={Layers}
                  title="Nothing selected"
                  description="Pick a question on the left to preview the stem, options, marking and explanation."
                />
              </div>
            )}
          </aside>
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit question' : 'New question'}
        description="Marking, difficulty and explanation feed straight into examination analysis."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="question-form" loading={saving}>
              {editing ? 'Save changes' : 'Add question'}
            </Button>
          </div>
        }
      >
        <form id="question-form" onSubmit={save} className="space-y-3.5" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Subject"
              value={form.subjectId}
              onChange={(event) => {
                const subject = SUBJECTS.find((item) => item.id === event.target.value)
                setForm((current) => ({ ...current, subjectId: event.target.value, topicId: subject.topics[0].id }))
              }}
              required
            >
              {SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
            <Select
              label="Topic"
              value={form.topicId}
              onChange={(event) => setForm((current) => ({ ...current, topicId: event.target.value }))}
              required
            >
              {activeSubject.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </Select>
            <Select
              label="Type"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value, correctAnswer: [], numericalAnswer: '' }))
              }
              required
            >
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type] || type}
                </option>
              ))}
            </Select>
            <Select
              label="Difficulty"
              value={form.difficulty}
              onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
              required
            >
              {QUESTION_DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </Select>
          </div>

          <TextArea
            label="Question text"
            value={form.text}
            onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
            error={errors.text}
            rows={3}
            hint="Minimum 15 characters. Use plain text; the examination renderer preserves line breaks."
            required
          />

          {form.type === 'numerical' ? (
            <TextInput
              label="Expected numerical answer"
              value={form.numericalAnswer}
              onChange={(event) => setForm((current) => ({ ...current, numericalAnswer: event.target.value }))}
              error={errors.correctAnswer}
              inputMode="decimal"
              placeholder="e.g. 2.5"
              required
            />
          ) : (
            <div>
              <p className="label-xs mb-1.5">Answer options</p>
              <div className="space-y-2">
                {form.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <label className="flex shrink-0 items-center gap-1.5">
                      <input
                        type={form.type === 'single' ? 'radio' : 'checkbox'}
                        name="correct-option"
                        checked={form.correctAnswer.includes(option.id)}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            correctAnswer:
                              current.type === 'single'
                                ? [option.id]
                                : current.correctAnswer.includes(option.id)
                                  ? current.correctAnswer.filter((id) => id !== option.id)
                                  : [...current.correctAnswer, option.id],
                          }))
                        }
                        className="h-3.5 w-3.5"
                        aria-label={`Mark option ${option.id} correct`}
                      />
                      <span className="w-4 text-[11.5px] font-semibold text-ink">{option.id}</span>
                    </label>
                    <input
                      value={option.text}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          options: current.options.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, text: event.target.value } : item,
                          ),
                        }))
                      }
                      className="field-input"
                      placeholder={`Option ${option.id}`}
                    />
                  </div>
                ))}
              </div>
              {errors.options ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.options}</p> : null}
              {errors.correctAnswer ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.correctAnswer}</p> : null}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Marks"
              type="number"
              min="0.5"
              step="0.5"
              value={form.marks}
              onChange={(event) => setForm((current) => ({ ...current, marks: event.target.value }))}
              error={errors.marks}
              required
            />
            <TextInput
              label="Negative marks"
              type="number"
              min="0"
              step="0.25"
              value={form.negativeMarks}
              onChange={(event) => setForm((current) => ({ ...current, negativeMarks: event.target.value }))}
              error={errors.negativeMarks}
              hint="Applied only when the examination allows negative marking."
            />
          </div>

          <TextArea
            label="Explanation"
            value={form.explanation}
            onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
            error={errors.explanation}
            rows={4}
            hint="Shown to students in the per-question analysis. Minimum 20 characters."
            required
          />

          <FormError>{formError}</FormError>
        </form>
      </Modal>
    </div>
  )
}

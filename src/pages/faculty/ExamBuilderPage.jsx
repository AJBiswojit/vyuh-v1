import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import { questionService } from '../../services/question.service.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { batchService } from '../../services/batch.service.js'
import { fromDateTimeLocalValue, toDateTimeLocalValue, formatDate } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Checkbox, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

const TYPES = ['Unit Test', 'Chapter Test', 'Full Mock', 'Practice Sheet']
const VISIBILITY = [
  { id: 'immediate', label: 'Show the result immediately after submission' },
  { id: 'after-window', label: 'Release after the examination window closes' },
  { id: 'withheld', label: 'Withhold the result until reviewed' },
]

function blankSection(subjectId, index) {
  return {
    id: `sec_${Date.now()}_${index}`,
    name: `Section ${String.fromCharCode(65 + index)}`,
    subjectId,
    instructions: '',
    questionIds: [],
    expanded: true,
  }
}

export default function ExamBuilderPage() {
  const { examId } = useParams()
  const editing = Boolean(examId)
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Unit Test',
    subjectId: SUBJECTS[0].id,
    batchIds: [],
    startAt: toDateTimeLocalValue(new Date(Date.now() + 86400000).toISOString()),
    endAt: toDateTimeLocalValue(new Date(Date.now() + 86400000 + 5400000).toISOString()),
    durationMinutes: 60,
    negativeMarking: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    resultVisibility: 'immediate',
    allowLateJoin: false,
  })
  const [sections, setSections] = useState([blankSection(SUBJECTS[0].id, 0)])
  const [pickerSectionId, setPickerSectionId] = useState(null)
  const [poolFilters, setPoolFilters] = useState({ subjectId: 'all', topicId: 'all', difficulty: 'all', search: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(null)

  const { data, error, loading } = useAsync(async () => {
    const [batches, pool] = await Promise.all([
      batchService.listBatches({ status: 'active' }),
      questionService.listQuestions({ pageSize: 300 }),
    ])
    if (!editing) return { batches, pool: pool.items, exam: null }
    const exam = await examService.getExam(examId)
    return { batches, pool: pool.items, exam }
  }, [examId, editing])

  const [hydrated, setHydrated] = useState(false)
  if (data?.exam && !hydrated) {
    setHydrated(true)
    setForm({
      title: data.exam.title,
      description: data.exam.description || '',
      type: data.exam.type,
      subjectId: data.exam.subjectId || SUBJECTS[0].id,
      batchIds: data.exam.batchIds || [],
      startAt: toDateTimeLocalValue(data.exam.startAt),
      endAt: toDateTimeLocalValue(data.exam.endAt),
      durationMinutes: data.exam.durationMinutes,
      negativeMarking: data.exam.negativeMarking,
      shuffleQuestions: data.exam.shuffleQuestions,
      shuffleOptions: data.exam.shuffleOptions,
      resultVisibility: data.exam.resultVisibility,
      allowLateJoin: data.exam.allowLateJoin,
    })
    setSections(
      (data.exam.sections || []).map((section) => ({
        id: section.id,
        name: section.name,
        subjectId: section.subjectId,
        instructions: section.instructions || '',
        questionIds: [...(section.questionIds || [])],
        expanded: true,
      })),
    )
  }

  const questionById = useMemo(() => {
    const index = {}
    ;(data?.pool || []).forEach((question) => {
      index[question.id] = question
    })
    return index
  }, [data])

  const usedIds = sections.flatMap((section) => section.questionIds)
  const filteredPool = useMemo(() => {
    if (!data) return []
    const needle = poolFilters.search.trim().toLowerCase()
    return data.pool.filter((question) => {
      if (poolFilters.subjectId !== 'all' && question.subjectId !== poolFilters.subjectId) return false
      if (poolFilters.topicId !== 'all' && question.topicId !== poolFilters.topicId) return false
      if (poolFilters.difficulty !== 'all' && question.difficulty !== poolFilters.difficulty) return false
      if (needle && !question.text.toLowerCase().includes(needle)) return false
      return true
    })
  }, [data, poolFilters])

  const totals = useMemo(() => {
    const questionIds = sections.flatMap((section) => section.questionIds)
    const marks = questionIds.reduce((sum, id) => sum + (questionById[id]?.marks ?? 4), 0)
    return { questions: questionIds.length, marks }
  }, [sections, questionById])

  const validate = () => {
    const next = {}
    if (String(form.title).trim().length < 5) next.title = 'Give the examination a title of at least 5 characters.'
    if (form.batchIds.length === 0) next.batchIds = 'Select at least one target batch.'
    if (!form.startAt || !form.endAt) next.endAt = 'Set both the start and end time.'
    else if (new Date(fromDateTimeLocalValue(form.endAt)) <= new Date(fromDateTimeLocalValue(form.startAt))) {
      next.endAt = 'The end time must be after the start time.'
    } else {
      const windowMinutes =
        (new Date(fromDateTimeLocalValue(form.endAt)) - new Date(fromDateTimeLocalValue(form.startAt))) / 60000
      if (windowMinutes < Number(form.durationMinutes)) next.durationMinutes = 'The window must be at least as long as the duration.'
    }
    if (!(Number(form.durationMinutes) > 0)) next.durationMinutes = 'Duration must be greater than zero.'
    const nonEmpty = sections.filter((section) => section.questionIds.length > 0)
    if (!nonEmpty.length) next.sections = 'Add at least one question to the paper.'
    if (usedIds.length !== new Set(usedIds).size) next.sections = 'A question appears more than once in the paper.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const save = async (publish = false) => {
    setFormError(null)
    if (!validate()) {
      toast.error('Check the examination', 'Fix the highlighted fields before saving.')
      return
    }
    setSaving(publish ? 'publish' : 'save')
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        startAt: fromDateTimeLocalValue(form.startAt),
        endAt: fromDateTimeLocalValue(form.endAt),
        durationMinutes: Number(form.durationMinutes),
        sections: sections
          .filter((section) => section.questionIds.length)
          .map((section) => ({
            id: section.id,
            name: section.name,
            subjectId: section.subjectId,
            instructions: section.instructions,
            questionIds: section.questionIds,
          })),
      }
      if (editing) {
        await examService.updateExam(examId, payload, { id: user.id, role: 'faculty', name: user.name })
        if (publish) {
          await examService.publishExam(examId, { id: user.id, role: 'faculty', name: user.name })
        }
        toast.success(publish ? 'Examination submitted' : 'Examination saved', publish ? 'Students are notified once it is live.' : 'Your changes are stored.')
      } else {
        const created = await examService.createExam(
          { ...payload, status: publish ? 'published' : 'draft' },
          { id: user.id, role: 'faculty', name: user.name },
        )
        toast.success(publish ? 'Examination published' : 'Draft created', created.title)
      }
      navigate('/faculty/exams')
    } catch (caught) {
      setFormError(caught?.message || 'The examination could not be saved.')
    } finally {
      setSaving(null)
    }
  }

  const addSection = () => setSections((current) => [...current, blankSection(form.subjectId, current.length)])

  const removeSection = async (section) => {
    if (sections.length === 1) {
      toast.error('At least one section is required')
      return
    }
    const ok = await confirm({
      title: `Remove ${section.name}?`,
      description: `The ${section.questionIds.length} question(s) in this section return to the pool.`,
      confirmLabel: 'Remove section',
      tone: 'danger',
    })
    if (ok) setSections((current) => current.filter((item) => item.id !== section.id))
  }

  const toggleQuestion = (sectionId, questionId) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section
        const has = section.questionIds.includes(questionId)
        return {
          ...section,
          questionIds: has ? section.questionIds.filter((id) => id !== questionId) : [...section.questionIds, questionId],
        }
      }),
    )
  }

  const moveQuestion = (sectionId, questionId, direction) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section
        const index = section.questionIds.indexOf(questionId)
        const next = [...section.questionIds]
        const target = index + direction
        if (target < 0 || target >= next.length) return section
        ;[next[index], next[target]] = [next[target], next[index]]
        return { ...section, questionIds: next }
      }),
    )
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title={editing ? 'Edit examination' : 'New examination'} />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title={editing ? 'Edit examination' : 'New examination'} backTo="/faculty/exams" backLabel="Examinations" />
        <ErrorState error={error} title="The builder could not be loaded" />
      </div>
    )
  }

  const pickerSection = sections.find((section) => section.id === pickerSectionId)
  const pickerTopics =
    poolFilters.subjectId === 'all'
      ? SUBJECTS.flatMap((subject) => subject.topics)
      : SUBJECTS.find((subject) => subject.id === poolFilters.subjectId)?.topics || []

  return (
    <div className="mx-auto max-w-[1120px]">
      <PageHeader
        eyebrow="Faculty workspace"
        title={editing ? 'Edit examination' : 'New examination'}
        description="Compose the paper, set the window and mark it ready. Students see the instruction page before every attempt."
        backTo="/faculty/exams"
        backLabel="Examinations"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Save} loading={saving === 'save'} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button size="sm" variant="primary" icon={Send} loading={saving === 'publish'} onClick={() => save(true)}>
              Publish
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="surface p-4">
            <h2 className="text-[13px] font-medium text-ink">Paper details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput
                  label="Title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  error={errors.title}
                  placeholder="e.g. Physics Unit Test 04 — Electrostatics"
                  required
                />
              </div>
              <Select
                label="Type"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Select
                label="Primary subject"
                value={form.subjectId}
                onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
              <TextInput
                label="Start"
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
                required
              />
              <TextInput
                label="End"
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
                error={errors.endAt}
                required
              />
              <TextInput
                label="Duration (minutes)"
                type="number"
                min="5"
                max="300"
                value={form.durationMinutes}
                onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                error={errors.durationMinutes}
                required
              />
              <Select
                label="Result visibility"
                value={form.resultVisibility}
                onChange={(event) => setForm((current) => ({ ...current, resultVisibility: event.target.value }))}
              >
                {VISIBILITY.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={2}
                  hint="Shown on the student examination list."
                />
              </div>
            </div>
          </section>

          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-medium text-ink">Sections and questions</h2>
              <div className="flex items-center gap-2 text-[10.5px] text-soft">
                <span>
                  {totals.questions} questions · {totals.marks} marks
                </span>
                <Button size="xs" variant="secondary" icon={Plus} onClick={addSection}>
                  Section
                </Button>
              </div>
            </div>
            {errors.sections ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.sections}</p> : null}

            <div className="mt-3 space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="rounded-[12px] border border-[var(--line)]">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSections((current) =>
                          current.map((item) => (item.id === section.id ? { ...item, expanded: !item.expanded } : item)),
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      aria-expanded={section.expanded}
                    >
                      {section.expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate text-[12px] font-medium text-ink">{section.name}</span>
                      <span className="shrink-0 text-[10px] text-soft">
                        {section.questionIds.length} Q ·{' '}
                        {section.questionIds.reduce((sum, id) => sum + (questionById[id]?.marks ?? 4), 0)} marks
                      </span>
                    </button>
                    <Button size="xs" variant="ghost" icon={Plus} onClick={() => setPickerSectionId(section.id)}>
                      Add questions
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeSection(section)}
                      className="icon-btn h-6 w-6 text-soft hover:text-[#8c2f2f]"
                      aria-label={`Remove ${section.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {section.expanded ? (
                    <div className="space-y-2 px-3 py-2.5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextInput
                          label="Section name"
                          value={section.name}
                          onChange={(event) =>
                            setSections((current) =>
                              current.map((item) => (item.id === section.id ? { ...item, name: event.target.value } : item)),
                            )
                          }
                        />
                        <Select
                          label="Section subject"
                          value={section.subjectId}
                          onChange={(event) =>
                            setSections((current) =>
                              current.map((item) => (item.id === section.id ? { ...item, subjectId: event.target.value } : item)),
                            )
                          }
                        >
                          {SUBJECTS.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <TextInput
                        label="Section instructions"
                        value={section.instructions}
                        onChange={(event) =>
                          setSections((current) =>
                            current.map((item) => (item.id === section.id ? { ...item, instructions: event.target.value } : item)),
                          )
                        }
                        placeholder="e.g. One option is correct. +4 correct, −1 incorrect."
                      />

                      {section.questionIds.length === 0 ? (
                        <div className="rounded-[8px] border border-dashed border-[var(--line-strong)] px-3 py-4 text-center">
                          <p className="text-[11px] text-soft">No questions yet.</p>
                          <Button size="xs" variant="secondary" className="mt-1.5" onClick={() => setPickerSectionId(section.id)}>
                            Pick from the bank
                          </Button>
                        </div>
                      ) : (
                        <ol className="space-y-1">
                          {section.questionIds.map((questionId, index) => {
                            const question = questionById[questionId]
                            return (
                              <li key={questionId} className="flex items-center gap-2 rounded-[8px] bg-[var(--surface-sunken)] px-2 py-1.5">
                                <span className="w-5 shrink-0 text-[10px] font-semibold text-soft tabular">{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11.5px] text-ink">{question?.text || questionId}</span>
                                  <span className="block text-[9.5px] text-soft">
                                    {question?.difficulty} · +{question?.marks ?? 4} / −{question?.negativeMarks ?? 0}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-0.5">
                                  <button type="button" onClick={() => moveQuestion(section.id, questionId, -1)} className="icon-btn h-5 w-5" aria-label="Move up">
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button type="button" onClick={() => moveQuestion(section.id, questionId, 1)} className="icon-btn h-5 w-5" aria-label="Move down">
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuestion(section.id, questionId)}
                                    className="icon-btn h-5 w-5 text-soft hover:text-[#8c2f2f]"
                                    aria-label="Remove question"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="surface p-4">
            <h2 className="text-[13px] font-medium text-ink">Target batches</h2>
            {errors.batchIds ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.batchIds}</p> : null}
            <div className="mt-2 space-y-1.5">
              {data.batches.map((batch) => (
                <Checkbox
                  key={batch.id}
                  label={`${batch.name} · ${batch.section}`}
                  description={`${batch.studentIds.length} students`}
                  checked={form.batchIds.includes(batch.id)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      batchIds: event.target.checked
                        ? [...current.batchIds, batch.id]
                        : current.batchIds.filter((id) => id !== batch.id),
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="surface p-4">
            <h2 className="text-[13px] font-medium text-ink">Marking and delivery</h2>
            <div className="mt-2 space-y-2">
              <Checkbox
                label="Negative marking"
                checked={form.negativeMarking}
                onChange={(event) => setForm((current) => ({ ...current, negativeMarking: event.target.checked }))}
                description="Uses each question's negative marks."
              />
              <Checkbox
                label="Shuffle questions"
                checked={form.shuffleQuestions}
                onChange={(event) => setForm((current) => ({ ...current, shuffleQuestions: event.target.checked }))}
              />
              <Checkbox
                label="Shuffle options"
                checked={form.shuffleOptions}
                onChange={(event) => setForm((current) => ({ ...current, shuffleOptions: event.target.checked }))}
              />
              <Checkbox
                label="Allow late joining"
                checked={form.allowLateJoin}
                onChange={(event) => setForm((current) => ({ ...current, allowLateJoin: event.target.checked }))}
                description="Only within the policy access window."
              />
            </div>
          </section>

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Summary</h2>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between"><dt className="text-muted">Sections</dt><dd className="font-medium text-ink">{sections.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Questions</dt><dd className="font-medium text-ink">{totals.questions}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Total marks</dt><dd className="font-medium text-ink">{totals.marks}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Duration</dt><dd className="font-medium text-ink">{form.durationMinutes} min</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Batches</dt><dd className="font-medium text-ink">{form.batchIds.length}</dd></div>
            </dl>
            {form.startAt ? (
              <p className="mt-2 text-[10px] text-soft">
                Window opens {formatDate(fromDateTimeLocalValue(form.startAt))}. The countdown starts only when a candidate
                begins.
              </p>
            ) : null}
          </section>

          <FormError>{formError}</FormError>

          <p className="text-[10px] leading-relaxed text-soft">
            Publishing may require administrator approval depending on institute policy. In that case the paper moves to
            awaiting-approval and students are notified only after approval.
          </p>
        </aside>
      </div>

      {pickerSection ? (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-[rgba(20,22,24,0.4)] px-4 py-6">
          <div className="flex max-h-[86vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div>
                <h2 className="text-[14px] font-medium text-ink">Add questions to {pickerSection.name}</h2>
                <p className="text-[11px] text-muted">
                  Questions already used elsewhere in this paper are disabled.
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPickerSectionId(null)} aria-label="Close picker">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-2">
              <div className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
                <input
                  value={poolFilters.search}
                  onChange={(event) => setPoolFilters((current) => ({ ...current, search: event.target.value }))}
                  className="field-input pl-8"
                  placeholder="Search the bank…"
                  aria-label="Search the question bank"
                />
              </div>
              <select
                value={poolFilters.subjectId}
                onChange={(event) => setPoolFilters((current) => ({ ...current, subjectId: event.target.value, topicId: 'all' }))}
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
                value={poolFilters.topicId}
                onChange={(event) => setPoolFilters((current) => ({ ...current, topicId: event.target.value }))}
                className="field-select w-auto"
                aria-label="Filter by topic"
              >
                <option value="all">All topics</option>
                {pickerTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <select
                value={poolFilters.difficulty}
                onChange={(event) => setPoolFilters((current) => ({ ...current, difficulty: event.target.value }))}
                className="field-select w-auto"
                aria-label="Filter by difficulty"
              >
                <option value="all">Any difficulty</option>
                {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>

            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {filteredPool.length === 0 ? (
                <p className="py-8 text-center text-[11.5px] text-soft">No question matches these filters.</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {filteredPool.map((question) => {
                    const inThisSection = pickerSection.questionIds.includes(question.id)
                    const usedElsewhere = usedIds.includes(question.id) && !inThisSection
                    return (
                      <li key={question.id} className="flex items-start gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={inThisSection}
                          disabled={usedElsewhere}
                          onChange={() => toggleQuestion(pickerSection.id, question.id)}
                          className="mt-1 h-3.5 w-3.5"
                          aria-label={`Use ${question.id}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] leading-snug text-ink">{question.text}</p>
                          <p className="mt-0.5 text-[9.5px] text-soft">
                            {question.subjectName} · {question.topicName} · {question.difficulty} · +{question.marks}
                            {usedElsewhere ? ' · already used in this paper' : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-2.5">
              <p className="text-[11px] text-soft">
                {pickerSection.questionIds.length} selected · {filteredPool.length} shown
              </p>
              <Button size="sm" variant="primary" onClick={() => setPickerSectionId(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

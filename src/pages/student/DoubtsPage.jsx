import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CornerDownRight,
  MessageSquare,
  MessageSquarePlus,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { doubtService } from '../../services/doubt.service.js'
import { relativeTime } from '../../lib/time.js'
import { subjectName, SUBJECTS } from '../../data/mock/subjects.mock.js'
import { EXPERTS } from '../../content.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { AccountAvatar } from '../../ui/account-identity.jsx'
import { TextArea, TextInput, Select, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

/* Faculty portraits are already published on the landing page in `EXPERTS`.
   Reuse those exact asset references instead of duplicating faculty records
   or generating new imagery in the doubts UI. */
const normaliseName = (name) => String(name || '').trim().toLowerCase()
const FACULTY_IMAGE_BY_NAME = new Map(
  EXPERTS.map((expert) => [normaliseName(expert.name), expert.image]),
)
const facultyPhotoFor = (name) => FACULTY_IMAGE_BY_NAME.get(normaliseName(name)) || null
const isFacultyAvailable = (availability) => /available/i.test(String(availability || ''))
const subjectForFaculty = (faculty) => {
  const label = String(faculty?.subjects?.[0] || '').toLowerCase()
  return SUBJECTS.find((subject) => subject.name.toLowerCase() === label) || null
}

function FacultyPhoto({ name }) {
  const [failed, setFailed] = useState(false)
  const src = facultyPhotoFor(name)

  if (!src || failed) {
    return (
      <span
        data-faculty-fallback="true"
        className="inline-flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-[var(--cream-100)] ring-1 ring-[var(--cream-300)]"
      >
        <AccountAvatar name={name} role="faculty" size="xl" className="h-[62px] w-[62px] text-[16px]" />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={`${name} profile photograph`}
      width="68"
      height="68"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      data-faculty-photo={src}
      className="h-[68px] w-[68px] shrink-0 rounded-full border-2 border-white bg-[var(--sky-50)] object-cover object-top ring-1 ring-[var(--sky-200)] shadow-[var(--shadow-xs)] transition duration-200 group-hover:ring-[var(--sky-400)] group-focus-visible:ring-[var(--sky-400)]"
    />
  )
}

function FacultyAvailability({ availability }) {
  const available = isFacultyAvailable(availability)
  const Icon = available ? CheckCircle2 : Clock3
  const label = availability || 'Availability not set'
  return (
    <span
      data-availability={available ? 'available' : 'busy'}
      aria-label={`Availability: ${label}`}
      className="inline-flex min-w-0"
    >
      <StatusBadge tone={available ? 'good' : 'warn'} className="min-w-0 max-w-full overflow-hidden">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{label}</span>
      </StatusBadge>
    </span>
  )
}

function FacultyCard({ faculty, onAsk }) {
  const availabilityLabel = faculty.availability || 'Availability not set'
  const schedule = faculty.officeHours || 'Schedule not set'
  const expertise = faculty.subjects?.join(' · ') || 'General'
  return (
    <li>
      <button
        type="button"
        onClick={() => onAsk(faculty)}
        data-faculty-card={faculty.id}
        data-faculty-name={faculty.name}
        data-faculty-subject={faculty.subjects?.[0] || ''}
        aria-label={`Ask ${faculty.name}, ${faculty.designation || 'faculty'}. ${expertise} expertise. ${availabilityLabel}. Schedule ${schedule}.`}
        className="group flex w-full items-start gap-3 rounded-[12px] border border-[var(--line)] bg-white p-3 text-left transition duration-150 hover:border-[var(--sky-300)] hover:bg-[var(--sky-50)] hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sky-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <FacultyPhoto key={faculty.name} name={faculty.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-ink">{faculty.name}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-soft">{faculty.designation || 'Faculty'}</p>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
            <BookOpen className="h-3 w-3 shrink-0 text-[var(--sky-700)]" aria-hidden="true" />
            <span className="truncate">{expertise}</span>
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-soft">
            <CalendarClock className="h-3 w-3 shrink-0 text-[var(--ink-45)]" aria-hidden="true" />
            <span className="truncate">{schedule}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <FacultyAvailability availability={faculty.availability} />
            <span
              data-ask-action="true"
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--sky-200)] bg-[var(--sky-100)] px-2 py-1 text-[10px] font-medium text-[var(--sky-800)] transition group-hover:border-[var(--sky-400)] group-hover:bg-[var(--sky-200)] group-focus-visible:bg-[var(--sky-200)]"
            >
              <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
              Ask
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </li>
  )
}

function AIAssistant({ conversations, onConversationsChange }) {
  const { user } = useAuth()
  const toast = useToast()
  const [activeId, setActiveId] = useState(conversations[0]?.id || null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  /* The message list is never stored: it always comes from the conversation the
     parent owns, so a reply cannot be shown twice or lost after a re-render. */
  const [draftMessages, setDraftMessages] = useState(conversations[0]?.messages || [])
  const endRef = useRef(null)

  const resolvedActiveId = activeId || conversations[0]?.id || null
  const activeConversation = conversations.find((item) => item.id === resolvedActiveId) || null
  const messages = activeConversation?.messages ?? draftMessages

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const selectConversation = async (conversationId) => {
    setActiveId(conversationId)
    try {
      const conversation = await doubtService.getConversation(conversationId)
      onConversationsChange(
        conversations.map((item) => (item.id === conversation.id ? conversation : item)),
      )
      setDraftMessages(conversation.messages)
    } catch (caught) {
      toast.error('Conversation could not be opened', caught?.message)
    }
  }

  const newConversation = async () => {
    try {
      const conversation = await doubtService.createConversation(user.id)
      onConversationsChange([conversation, ...conversations])
      setActiveId(conversation.id)
      setDraftMessages([])
    } catch (caught) {
      toast.error('Could not start a conversation', caught?.message)
    }
  }

  const clear = async () => {
    if (!resolvedActiveId) return
    try {
      const cleared = await doubtService.clearConversation(resolvedActiveId)
      const conversation = cleared.messages ? cleared : { ...activeConversation, messages: [] }
      onConversationsChange(
        conversations.map((item) => (item.id === resolvedActiveId ? conversation : item)),
      )
      setDraftMessages([])
      toast.info('Chat cleared', 'The conversation is empty; the thread itself is kept.')
    } catch (caught) {
      toast.error('The conversation could not be cleared', caught?.message)
    }
  }

  const send = async (text) => {
    const value = String(text ?? input).trim()
    if (!value) return
    let conversationId = resolvedActiveId
    if (!conversationId) {
      const conversation = await doubtService.createConversation(user.id)
      onConversationsChange([conversation, ...conversations])
      conversationId = conversation.id
      setActiveId(conversationId)
    }
    setPending(true)
    setInput('')
    try {
      const result = await doubtService.sendAssistantMessage(conversationId, value)
      setDraftMessages(result.conversation.messages)
      onConversationsChange(
        conversations.map((conversation) => (conversation.id === conversationId ? result.conversation : conversation)),
      )
    } catch (caught) {
      toast.error('The assistant could not respond', caught?.message)
      setInput(value)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="surface-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-ink">Conversations</p>
          <button type="button" onClick={newConversation} className="icon-btn h-7 w-7" aria-label="New conversation">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-soft">No conversations yet.</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={`w-full rounded-[8px] px-2 py-1.5 text-left text-[11.5px] transition ${
                  resolvedActiveId === conversation.id ? 'bg-[var(--sky-50)] font-medium text-ink' : 'text-ink-70 hover:bg-[var(--surface-sunken)]'
                }`}
              >
                <span className="block truncate">{conversation.title}</span>
                <span className="block text-[10px] text-soft">{relativeTime(conversation.updatedAt)}</span>
              </button>
            ))
          )}
        </div>
        <div className="mt-3 rounded-[8px] bg-[var(--cream-100)] p-2.5">
          <p className="flex items-center gap-1 text-[10.5px] font-medium text-[#6b5c33]">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Demo AI assistant
          </p>
          <p className="mt-1 text-[10px] leading-snug text-[#6b5c33]/85">
            Responses are contextual templates grounded in the Vyuh question bank. No language model is called.
          </p>
        </div>
      </aside>

      <section className="surface-flat flex min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink">AI doubt assistant</p>
            <p className="text-[10px] text-soft">Subject-aware · step-by-step explanations</p>
          </div>
          {messages.length ? (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-[10.5px] text-soft hover:text-ink">
              <Trash2 className="h-3 w-3" /> Clear chat
            </button>
          ) : null}
        </div>

        <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
          {messages.length === 0 ? (
            <div className="py-8">
              <EmptyState
                compact
                icon={Sparkles}
                title="Ask a concept question"
                description="Try “explain rolling without slipping for a hoop” or “how is attendance calculated?”"
              />
              <div className="mx-auto mt-3 flex max-w-[420px] flex-wrap justify-center gap-1.5">
                {['Explain moment of inertia for a disc', 'How is attendance calculated?', 'Give me a full-mock strategy'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10.5px] text-ink-70 transition hover:border-[var(--line-strong)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] ${message.role === 'student' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block whitespace-pre-line rounded-[12px] px-3 py-2 text-left text-[12px] leading-relaxed ${
                      message.role === 'student' ? 'bg-[var(--sky-800)] text-white' : 'border border-[var(--sky-200)] bg-[var(--sky-50)] text-ink'
                    }`}
                  >
                    {message.text}
                  </div>
                  <p className="mt-1 text-[9.5px] text-soft">
                    {message.role === 'assistant' ? message.sourceLabel || 'Demo assistant' : 'You'} · {relativeTime(message.at)}
                  </p>
                  {message.suggested?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {message.suggested.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => send(suggestion)}
                          className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-link transition hover:border-[var(--sky-400)]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {pending ? (
            <p className="flex items-center gap-1.5 text-[11px] text-soft">
              <span className="h-3 w-3 animate-spin rounded-full border border-[var(--line-strong)] border-t-[var(--ink)]" />
              Assistant is composing a contextual answer…
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-[var(--line)] p-2.5"
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <div className="flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Ask about a concept, an examination strategy or attendance rules…"
              className="field-textarea min-h-[40px] flex-1"
              aria-label="Message the assistant"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !input.trim()} aria-label="Send">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[9.5px] text-soft">
            Demonstration only. Image and question attachments route to faculty in the Ask Faculty tab.
          </p>
        </form>
      </section>
    </div>
  )
}

export default function DoubtsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'faculty')
  const [askOpen, setAskOpen] = useState(false)
  const [form, setForm] = useState({ subjectId: 'sub_phy', topicId: 'top_phy_rotation', title: '', body: '', priority: 'normal', facultyId: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, error, loading, refresh, setData } = useAsync(
    async () => {
      const [doubts, facultyDirectory] = await Promise.all([
        doubtService.listStudentDoubts(user.id),
        doubtService.getFacultyDirectoryForStudent(user.id),
      ])
      return { ...doubts, facultyDirectory }
    },
    [user.id],
  )

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested) setTab(requested)
  }, [searchParams])

  const changeTab = (next) => {
    setTab(next)
    setSearchParams(next === 'faculty' ? {} : { tab: next })
  }

  const selectFaculty = (faculty) => {
    const subject = subjectForFaculty(faculty)
    setForm((current) => ({
      ...current,
      facultyId: faculty.id,
      subjectId: subject?.id || current.subjectId,
      topicId: subject?.topics?.[0]?.id || current.topicId,
    }))
    setErrors({})
    setFormError(null)
    setAskOpen(true)
  }

  const selectedSubject = useMemo(() => SUBJECTS.find((subject) => subject.id === form.subjectId), [form.subjectId])

  const submitDoubt = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      title: [rules.required('Title'), rules.minLength(8, 'Title')],
      body: [rules.required('Description'), rules.minLength(20, 'Description')],
      subjectId: [rules.required('Subject')],
    })
    setErrors(validationErrors)
    if (!valid) return
    setSubmitting(true)
    try {
      const created = await doubtService.createDoubt(
        {
          subjectId: form.subjectId,
          topicId: form.topicId,
          title: form.title,
          body: form.body,
          priority: form.priority,
          facultyId: form.facultyId || undefined,
        },
        { id: user.id, role: 'student', name: user.name },
      )
      setData((current) => ({ ...current, doubts: [created, ...current.doubts] }))
      setAskOpen(false)
      setForm({ subjectId: 'sub_phy', topicId: 'top_phy_rotation', title: '', body: '', priority: 'normal', facultyId: '' })
      toast.success('Doubt submitted', `${created.faculty?.name} has been notified and can reply from the faculty inbox.`)
    } catch (caught) {
      setFormError(caught?.message || 'The doubt could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Doubts" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Doubts" />
        <ErrorState error={error} onRetry={refresh} title="Doubts could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Doubts"
        description="Ask the demonstration AI assistant for an immediate explanation, or send the doubt to your faculty."
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setAskOpen(true)}>
            Ask faculty
          </Button>
        }
      />

      <div className="tab-row mb-4" role="tablist" aria-label="Doubt interfaces">
        <button type="button" role="tab" aria-selected={tab === 'ai'} className="tab" onClick={() => changeTab('ai')}>
          <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" /> AI assistant
        </button>
        <button type="button" role="tab" aria-selected={tab === 'faculty'} className="tab" onClick={() => changeTab('faculty')}>
          <User className="mr-1 inline h-3 w-3" aria-hidden="true" /> Ask faculty ({data.doubts.length})
        </button>
      </div>

      {tab === 'ai' ? (
        <AIAssistant
          conversations={data.conversations}
          onConversationsChange={(conversations) => setData((current) => ({ ...current, conversations }))}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-2.5">
            {data.doubts.length === 0 ? (
              <div className="surface-flat">
                <EmptyState
                  icon={MessageSquare}
                  title="No doubts yet"
                  description="Ask your faculty a question and the thread will appear here with every reply."
                  action={
                    <Button size="sm" variant="primary" icon={Plus} onClick={() => setAskOpen(true)}>
                      Ask your first doubt
                    </Button>
                  }
                />
              </div>
            ) : (
              data.doubts.map((doubt) => (
                <Link
                  key={doubt.id}
                  to={`/student/doubts/${doubt.id}`}
                  className="surface-flat block p-4 transition hover:border-[var(--line-strong)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(doubt.status)} dot>
                      {statusLabel(doubt.status)}
                    </StatusBadge>
                    <span className="badge badge-sky">{subjectName(doubt.subjectId)}</span>
                    <span className="badge badge-outline">{doubt.topicName}</span>
                    {doubt.priority === 'high' ? <StatusBadge tone="danger">High priority</StatusBadge> : null}
                    <span className="ml-auto text-[10px] text-soft">{relativeTime(doubt.updatedAt)}</span>
                  </div>
                  <h3 className="mt-2 flex items-center gap-1 text-[13.5px] font-medium leading-snug text-ink">
                    {doubt.title}
                    <ArrowRight className="h-3 w-3 text-soft" aria-hidden="true" />
                  </h3>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted clamp-2">{doubt.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10.5px] text-soft">
                    <CornerDownRight className="h-3 w-3" aria-hidden="true" />
                    {doubt.replies.length ? (
                      <span>
                        {doubt.faculty?.name} replied · {relativeTime(doubt.lastActivityAt)}
                      </span>
                    ) : (
                      <span>Awaiting a reply from {doubt.faculty?.name}</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          <aside className="space-y-3">
            <section className="surface-flat p-3.5">
              <p className="text-[12px] font-medium text-ink">Faculty for your batch</p>
              <ul className="mt-2 space-y-2">
                {data.facultyDirectory.map((faculty) => (
                  <FacultyCard key={faculty.id} faculty={faculty} onAsk={selectFaculty} />
                ))}
              </ul>
            </section>

            <section className="surface-flat p-3.5">
              <p className="text-[12px] font-medium text-ink">Your doubt activity</p>
              <dl className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex justify-between"><dt className="text-muted">Open</dt><dd className="font-medium text-ink">{data.stats.open}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Answered</dt><dd className="font-medium text-ink">{data.stats.answered}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Resolved</dt><dd className="font-medium text-ink">{data.stats.resolved}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Awaiting reply</dt><dd className="font-medium text-ink">{data.stats.awaitingReply}</dd></div>
              </dl>
            </section>
          </aside>
        </div>
      )}

      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title="Ask faculty"
        description="Your doubt goes directly to the faculty member assigned to your batch for that subject."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAskOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="ask-doubt-form" loading={submitting} icon={Send}>
              Submit doubt
            </Button>
          </div>
        }
      >
        <form id="ask-doubt-form" className="space-y-3.5" onSubmit={submitDoubt} noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Subject"
              value={form.subjectId}
              onChange={(event) => {
                const subjectId = event.target.value
                const subject = SUBJECTS.find((item) => item.id === subjectId)
                setForm((current) => ({ ...current, subjectId, topicId: subject?.topics[0]?.id || '' }))
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
              {(selectedSubject?.topics || []).map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </Select>
          </div>

          <TextInput
            label="Title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            error={errors.title}
            placeholder="Summarise the doubt in one line"
            required
          />

          <TextArea
            label="Describe the doubt"
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            error={errors.body}
            rows={4}
            placeholder="Explain where you get stuck. Mention the step you have already tried."
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
              <option value="normal">Normal</option>
              <option value="high">High — blocking my revision</option>
            </Select>
            <Select
              label="Faculty (optional)"
              value={form.facultyId}
              onChange={(event) => setForm((current) => ({ ...current, facultyId: event.target.value }))}
            >
              <option value="">Auto-assign by subject</option>
              {data.facultyDirectory.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-[10px] border border-dashed border-[var(--line-strong)] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Attachment
            </p>
            <p className="mt-0.5 text-[10.5px] text-soft">
              Image attachment is not uploaded in this demonstration — the seeded doubts show how an attachment is stored
              once a real file service exists.
            </p>
          </div>

          <FormError>{formError}</FormError>
          <p className="text-[10px] text-soft">Your faculty is notified in-app as soon as the doubt is submitted.</p>
        </form>
      </Modal>
    </div>
  )
}

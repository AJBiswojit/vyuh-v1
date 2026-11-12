import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  ChevronDown,
  FileText,
  Info,
  Inbox,
  LifeBuoy,
  Mail,
  MessageSquarePlus,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { supportService } from '../../services/support.service.js'
import { supportAiService } from '../../services/support-ai.service.js'
import { SUPPORT_CATEGORIES, SUPPORT_STATUS_LABELS } from '../../data/mock/support.mock.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Field, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function attachmentFiles(files) {
  return [...(files || [])].slice(0, 5).map((file) => ({
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
  }))
}

function AttachmentList({ attachments = [], emptyHint = 'No attachment metadata recorded.' }) {
  if (!attachments.length) return <p className="mt-1 text-[10px] text-soft">{emptyHint}</p>
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((file, index) => (
        <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] text-muted">
          <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
          <span className="max-w-[160px] truncate">{file.name}</span>
          <span className="text-soft">· {formatBytes(file.size)}</span>
        </li>
      ))}
    </ul>
  )
}

function TicketActivity({ ticket }) {
  return (
    <ol className="support-timeline" aria-label={`Activity for ${ticket.code || ticket.id}`}>
      {(ticket.activity || []).map((event) => (
        <li key={event.id} className="support-timeline-item">
          <span className={`support-timeline-dot ${event.kind === 'status' ? 'is-status' : ''}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink">{event.authorName}</span>
              <span className="text-[9.5px] text-soft">{formatDate(event.at)} · {relativeTime(event.at)}</span>
              {event.kind === 'status' ? (
                <StatusBadge tone={statusTone(event.status)}>{SUPPORT_STATUS_LABELS[event.status] || event.status}</StatusBadge>
              ) : null}
              {event.kind === 'reopened' ? <StatusBadge tone="warn">Reopened</StatusBadge> : null}
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{event.message}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function TicketPanel({
  ticket,
  roleLabel,
  pendingAction,
  onReply,
  onReopen,
}) {
  const [reply, setReply] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const isClosed = ['resolved', 'closed'].includes(ticket.status)

  const submitReply = async (event) => {
    event.preventDefault()
    setError(null)
    try {
      await onReply(ticket.id, reply)
      setReply('')
    } catch (caught) {
      setError(caught?.message || 'The reply could not be sent.')
    }
  }

  const submitReopen = async (event) => {
    event.preventDefault()
    setError(null)
    try {
      await onReopen(ticket.id, reason)
      setReason('')
    } catch (caught) {
      setError(caught?.message || 'The ticket could not be reopened.')
    }
  }

  return (
    <article className="surface-flat flex min-h-[520px] flex-col overflow-hidden">
      <header className="border-b border-[var(--line)] px-3.5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="label-xs">{ticket.code || ticket.id} · {ticket.category}</p>
            <h3 className="mt-1 text-[14px] font-medium leading-snug text-ink">{ticket.subject}</h3>
            <p className="mt-0.5 text-[10px] text-soft">Raised {formatDate(ticket.createdAt)} · {ticket.priority} priority · from {roleLabel}</p>
          </div>
          <StatusBadge tone={statusTone(ticket.status)} dot>{statusLabel(ticket.status)}</StatusBadge>
        </div>
        {ticket.context?.lastTopic ? (
          <p className="mt-2 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] px-2 py-1 text-[10px] text-[var(--sky-900)]">
            Escalated from AI Auto Support · last topic {ticket.context.lastTopic}. Mock conversation transcript is included in the description.
          </p>
        ) : null}
        <AttachmentList attachments={ticket.attachments} />
      </header>

      <div className="flex-1 overflow-y-auto px-3.5 py-3">
        <TicketActivity ticket={ticket} />
        {ticket.source === 'ai-escalation' && ticket.context?.transcript ? (
          <details className="mt-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
            <summary className="cursor-pointer text-[11px] font-medium text-ink">View escalated mock conversation</summary>
            <p className="mt-1.5 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">{ticket.context.transcript}</p>
          </details>
        ) : null}
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--surface-sunken)] p-3">
        {isClosed ? (
          <form onSubmit={submitReopen} className="space-y-2">
            <p className="text-[11px] font-medium text-ink">Reopen this ticket</p>
            <TextArea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="Explain why this issue still needs attention (at least 10 characters)."
              aria-label="Reason to reopen ticket"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-soft">The Admin Support desk is notified in-app.</span>
              <Button size="sm" variant="secondary" icon={RotateCcw} type="submit" loading={pendingAction} disabled={!reason.trim()}>
                Reopen ticket
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitReply} className="space-y-2">
            <p className="text-[11px] font-medium text-ink">Reply in the same thread</p>
            <TextArea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={2}
              placeholder="Add the missing context or answer the admin question."
              aria-label="Ticket reply"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-soft">Admin receives an in-app notification.</span>
              <Button size="sm" variant="primary" icon={Send} type="submit" loading={pendingAction} disabled={!reply.trim()}>
                Send reply
              </Button>
            </div>
          </form>
        )}
        <FormError>{error}</FormError>
      </div>
    </article>
  )
}

export default function SupportWorkspace({
  role = 'student',
  faqs = [],
  guideTitle = 'Before you raise a ticket',
  guideItems = [],
  description,
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const ticketParam = searchParams.get('ticket')
  const roleLabel = role === 'faculty' ? 'Faculty' : 'Student'
  const [tab, setTab] = useState(ticketParam ? 'admin' : 'ai')
  const [ticketOpen, setTicketOpen] = useState(false)
  const [form, setForm] = useState({ category: SUPPORT_CATEGORIES[0], subject: '', message: '', attachments: [] })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [requestedTicketId, setRequestedTicketId] = useState(ticketParam || null)
  const [replyPending, setReplyPending] = useState(false)
  const [aiRevision, setAiRevision] = useState(0)
  const [requestedConversationId, setRequestedConversationId] = useState(null)
  const [question, setQuestion] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [aiError, setAiError] = useState(null)
  const chatEndRef = useRef(null)

  const actor = useMemo(() => ({ id: user.id, role, name: user.name }), [user.id, user.name, role])
  const tickets = useAsync(() => supportService.listForUser(user.id), [user.id])
  const ai = useAsync(() => supportAiService.listConversations(user.id), [user.id, aiRevision])

  const ticketList = tickets.data?.tickets || []
  const conversationList = ai.data?.conversations || []
  const activeTicketId = ticketList.length
    ? (ticketList.some((ticket) => ticket.id === requestedTicketId) ? requestedTicketId : ticketList[0].id)
    : requestedTicketId
  const selectedTicketId = ticketParam || activeTicketId
  const selectedConversationId = conversationList.length
    ? (conversationList.some((item) => item.id === requestedConversationId) ? requestedConversationId : conversationList[0].id)
    : requestedConversationId
  const selectedTicket = ticketList.find((ticket) => ticket.id === selectedTicketId) || null
  const conversation = conversationList.find((item) => item.id === selectedConversationId) || null
  const provider = ai.data?.provider || supportAiService.provider

  useEffect(() => {
    if (tab === 'ai') chatEndRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [tab, selectedConversationId, ai.data])

  const submitTicket = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      subject: [rules.required('Subject'), rules.minLength(8, 'Subject')],
      message: [rules.required('Message'), rules.minLength(25, 'Message')],
    })
    setErrors(validationErrors)
    if (!valid) return
    setSubmitting(true)
    try {
      const ticket = await supportService.createTicket(
        {
          category: form.category,
          subject: form.subject,
          description: form.message,
          priority: 'normal',
          attachments: form.attachments,
          source: 'direct',
        },
        actor,
      )
      setRequestedTicketId(ticket.id)
      tickets.setData((current) => ({ ...(current || { stats: {} }), tickets: [ticket, ...(current?.tickets || [])] }))
      setTicketOpen(false)
      setForm({ category: SUPPORT_CATEGORIES[0], subject: '', message: '', attachments: [] })
      setTab('admin')
      toast.success('Ticket raised', `${ticket.code || ticket.id} is now visible to Admin Support.`)
    } catch (caught) {
      setFormError(caught?.message || 'The ticket could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  const replyTicket = async (ticketId, body) => {
    setReplyPending(true)
    try {
      const updated = await supportService.reply(ticketId, body, actor)
      tickets.setData((current) => ({
        ...(current || { stats: {} }),
        tickets: (current?.tickets || []).map((ticket) => (ticket.id === ticketId ? updated : ticket)),
      }))
      toast.success('Reply added', `Your response is saved in ${updated.code || updated.id}.`)
    } catch (caught) {
      toast.error('Reply failed', caught?.message)
      throw caught
    } finally {
      setReplyPending(false)
    }
  }

  const reopenTicket = async (ticketId, reason) => {
    setReplyPending(true)
    try {
      const updated = await supportService.reopenTicket(ticketId, reason, actor)
      tickets.setData((current) => ({
        ...(current || { stats: {} }),
        tickets: (current?.tickets || []).map((ticket) => (ticket.id === ticketId ? updated : ticket)),
      }))
      toast.success('Ticket reopened', `${updated.code || updated.id} is back in the Admin Support queue.`)
    } catch (caught) {
      toast.error('Could not reopen ticket', caught?.message)
      throw caught
    } finally {
      setReplyPending(false)
    }
  }

  const newConversation = async () => {
    setAiError(null)
    setAiPending(true)
    try {
      const created = await supportAiService.createConversation(user.id, `New ${roleLabel} Auto Support conversation`)
      setRequestedConversationId(created.id)
      setAiRevision((revision) => revision + 1)
      toast.success('Conversation started', 'Ask a suggested question or type your own.')
    } catch (caught) {
      setAiError(caught?.message || 'A new conversation could not be started.')
    } finally {
      setAiPending(false)
    }
  }

  const sendQuestion = async (event, overrideText) => {
    event?.preventDefault?.()
    const text = String(overrideText ?? question).trim()
    if (!text) return
    setAiError(null)
    setAiPending(true)
    try {
      let activeId = selectedConversationId
      if (!activeId) {
        const created = await supportAiService.createConversation(user.id, text.slice(0, 70))
        activeId = created.id
        setRequestedConversationId(activeId)
      }
      const result = await supportAiService.sendMessage(activeId, text, actor)
      setQuestion('')
      ai.setData((current) => {
        const conversations = (current?.conversations || []).filter((item) => item.id !== activeId)
        return { ...(current || {}), conversations: [result.conversation, ...conversations] }
      })
    } catch (caught) {
      setAiError(caught?.message || 'The mock response could not be generated.')
    } finally {
      setAiPending(false)
    }
  }

  const escalate = async () => {
    if (!conversation) return
    setAiError(null)
    setAiPending(true)
    try {
      const result = await supportAiService.escalateToAdmin(conversation.id, actor, {
        reason: `Please review the ${roleLabel.toLowerCase()} question in this mock conversation and advise.`,
      })
      setRequestedTicketId(result.ticket.id)
      setTab('admin')
      tickets.setData((current) => ({ ...(current || { stats: {} }), tickets: [result.ticket, ...(current?.tickets || [])] }))
      ai.setData((current) => ({
        ...(current || {}),
        conversations: (current?.conversations || []).map((item) => (item.id === conversation.id ? result.conversation : item)),
      }))
      toast.success('Escalated to Admin Support', `${result.ticket.code || result.ticket.id} was created from this conversation.`)
    } catch (caught) {
      setAiError(caught?.message || 'The conversation could not be escalated.')
    } finally {
      setAiPending(false)
    }
  }

  const tabs = (
    <div className="tab-row mb-4" role="tablist" aria-label="Support channels">
      <button type="button" role="tab" aria-selected={tab === 'ai'} className="tab" onClick={() => setTab('ai')}>AI Auto Support</button>
      <button type="button" role="tab" aria-selected={tab === 'admin'} className="tab" onClick={() => setTab('admin')}>
        Admin Support {tickets.data?.stats?.pending ? <span className="ml-1 rounded-full bg-[var(--warn-100)] px-1.5 py-0.5 text-[9px] text-[var(--warn-800)]">{tickets.data.stats.pending}</span> : null}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'guide'} className="tab" onClick={() => setTab('guide')}>FAQ & guide</button>
    </div>
  )

  return (
    <div>
      <PageHeader
        eyebrow={`${roleLabel} workspace`}
        title="Support"
        description={description || 'Ask the clearly labelled Mock response service, track Admin Support tickets in one thread, or read the workspace FAQ.'}
        actions={
          <Button size="sm" variant="primary" icon={MessageSquarePlus} onClick={() => setTicketOpen(true)}>
            Raise a ticket
          </Button>
        }
      />
      {tabs}

      {tab === 'ai' ? (
        <section aria-labelledby="ai-support-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-[var(--sky-800)]" aria-hidden="true" />
              <h2 id="ai-support-heading" className="display-sm text-ink">AI Auto Support</h2>
            </div>
            <StatusBadge tone="neutral">{provider.sourceLabel || supportAiService.provider.sourceLabel}</StatusBadge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]">
            <aside className="space-y-3">
              <div className="surface-sky p-3.5">
                <p className="page-eyebrow">Response source</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--sky-900)]">
                  {provider.description || supportAiService.provider.description} Academic and application questions are answered from existing local records only.
                </p>
                <div className="mt-2 flex items-start gap-1.5 rounded-[9px] border border-[var(--sky-200)] bg-white/70 p-2">
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--sky-800)]" aria-hidden="true" />
                  <p className="text-[10px] leading-relaxed text-[var(--sky-900)]">
                    No live AI model, API key or external provider is connected. Do not enter passwords, banking credentials or sensitive personal details.
                  </p>
                </div>
                <Button size="sm" variant="secondary" icon={Plus} className="mt-2 w-full" onClick={newConversation} loading={aiPending}>
                  New conversation
                </Button>
              </div>

              <div className="surface-flat p-3.5">
                <h3 className="text-[12px] font-medium text-ink">Suggested questions</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(ai.data?.suggestions || []).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[10.5px] text-ink transition hover:border-[var(--sky-300)] hover:bg-[var(--sky-50)]"
                      onClick={() => sendQuestion(null, suggestion.text)}
                      disabled={aiPending}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-soft">Area labels: {role === 'faculty' ? 'teaching / operations' : 'academic / application'}.</p>
              </div>

              <div className="surface-flat overflow-hidden">
                <h3 className="border-b border-[var(--line)] px-3.5 py-2.5 text-[12px] font-medium text-ink">Conversations</h3>
                {ai.loading && !ai.data ? <LoadingBlock rows={2} /> : null}
                {ai.error ? <ErrorState compact error={ai.error} onRetry={ai.refresh} title="Conversations could not be loaded" /> : null}
                {!ai.loading && !ai.error && !(ai.data?.conversations || []).length ? (
                  <EmptyState compact icon={Inbox} title="No conversations yet" description="Start a conversation or choose a suggested question." />
                ) : null}
                <div className="max-h-[220px] space-y-1 overflow-y-auto p-2">
                  {(ai.data?.conversations || []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selectedConversationId === item.id}
                      onClick={() => setRequestedConversationId(item.id)}
                      className={`w-full rounded-[10px] border px-2.5 py-2 text-left transition ${
                        selectedConversationId === item.id
                          ? 'border-[var(--sky-300)] bg-[var(--sky-50)]'
                          : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'
                      }`}
                    >
                      <p className="truncate text-[11.5px] font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 text-[9.5px] text-soft">{item.messageCount} messages · {relativeTime(item.lastMessageAt)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="surface-flat flex min-h-[540px] flex-col overflow-hidden">
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--line)] px-3.5 py-3">
                <div className="min-w-0">
                  <p className="label-xs">Mock response service</p>
                  <h3 className="mt-1 text-[13.5px] font-medium text-ink">{conversation?.title || 'Start a support conversation'}</h3>
                  <p className="mt-0.5 text-[10px] text-soft">{provider.sourceLabel || supportAiService.provider.sourceLabel}</p>
                </div>
                <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={escalate} loading={aiPending} disabled={!conversation?.messages?.length}>
                  Escalate to Admin
                </Button>
              </header>

              <div className="support-chat flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
                {!conversation ? (
                  <EmptyState
                    icon={Sparkles}
                    title="Ask a question to begin"
                    description="Responses are deterministic templates grounded in existing mock records. This is not a live AI model."
                    action={<Button size="sm" variant="primary" icon={Plus} onClick={newConversation}>Start conversation</Button>}
                  />
                ) : conversation.messages.length === 0 ? (
                  <EmptyState compact icon={Bot} title="No messages yet" description="Choose a suggested question or type your own below." />
                ) : (
                  conversation.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`support-message ${message.role === 'assistant' ? 'is-assistant' : message.role === 'system' ? 'is-system' : 'is-user'}`}
                    >
                      <p className="support-message-meta">
                        {message.role === 'assistant' ? 'Mock response' : message.role === 'system' ? 'System' : roleLabel}
                        {' · '}{formatDate(message.at)}
                        {message.topic ? ` · ${message.topic}` : ''}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed">{message.text}</p>
                      {message.sourceLabel ? <p className="mt-1 text-[9.5px] opacity-70">{message.sourceLabel}</p> : null}
                      {message.suggested?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.suggested.map((suggestion, index) => (
                            <button
                              key={`${message.id}-${index}`}
                              type="button"
                              className="rounded-full border border-current/20 px-2 py-0.5 text-[9.5px] opacity-85 hover:opacity-100"
                              onClick={() => sendQuestion(null, suggestion)}
                              disabled={aiPending}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={(event) => sendQuestion(event)} className="border-t border-[var(--line)] bg-[var(--surface-sunken)] p-3">
                <div className="flex items-end gap-2">
                  <TextArea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={2}
                    placeholder="Ask about attendance, exams, fees, classes or Admin Support…"
                    aria-label="Ask AI Auto Support"
                    className="flex-1"
                  />
                  <Button type="submit" variant="primary" icon={Send} loading={aiPending} disabled={!question.trim()}>
                    Send
                  </Button>
                </div>
                <FormError>{aiError}</FormError>
                <p className="mt-1 text-[9.5px] text-soft">Local demo only · no hosted model or external AI provider · escalation creates a real in-app Admin Support ticket.</p>
              </form>
            </section>
          </div>
        </section>
      ) : null}

      {tab === 'admin' ? (
        <section aria-labelledby="admin-support-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5 text-[var(--sky-800)]" aria-hidden="true" />
              <h2 id="admin-support-heading" className="display-sm text-ink">Admin Support tickets</h2>
            </div>
            <span className="text-[10.5px] text-soft">
              {tickets.data?.stats?.pending || 0} pending · {tickets.data?.stats?.resolved || 0} resolved · {tickets.data?.stats?.total || 0} total
            </span>
          </div>

          {tickets.loading && !tickets.data ? <LoadingBlock rows={7} /> : null}
          {tickets.error ? <ErrorState error={tickets.error} onRetry={tickets.refresh} title="Tickets could not be loaded" /> : null}

          {!tickets.loading && !tickets.error ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
              <aside className="space-y-2">
                <div className="surface-flat p-2.5">
                  <p className="px-1 pb-2 text-[11px] font-medium text-ink">Your tickets</p>
                  {(tickets.data?.tickets || []).length === 0 ? (
                    <EmptyState
                      compact
                      icon={Inbox}
                      title="No tickets raised"
                      description="Raise a ticket with the issue details and optional attachment metadata."
                      action={<Button size="sm" variant="primary" icon={Plus} onClick={() => setTicketOpen(true)}>Raise a ticket</Button>}
                    />
                  ) : (
                    <div className="max-h-[600px] space-y-1.5 overflow-y-auto">
                      {(tickets.data?.tickets || []).map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          aria-pressed={selectedTicketId === ticket.id}
                          onClick={() => setRequestedTicketId(ticket.id)}
                          className={`w-full rounded-[10px] border px-2.5 py-2 text-left transition ${
                            selectedTicketId === ticket.id
                              ? 'border-[var(--sky-300)] bg-[var(--sky-50)]'
                              : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</StatusBadge>
                            <span className="ml-auto font-mono text-[9px] text-soft">{ticket.code || ticket.id}</span>
                          </div>
                          <p className="mt-1 truncate text-[11.5px] font-medium text-ink">{ticket.subject}</p>
                          <p className="mt-0.5 text-[9.5px] text-soft">{ticket.category} · {ticket.replyCount} replies · updated {relativeTime(ticket.updatedAt)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="surface-cream p-3">
                  <p className="text-[11px] font-medium text-[var(--cream-900)]">Shared ticket status</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[var(--cream-800)]">
                    Admin responses, status changes and reopen actions use the same ticket ID and activity timeline. Notifications link back to this tab.
                  </p>
                </div>
              </aside>

              {selectedTicket ? (
                <TicketPanel
                  ticket={selectedTicket}
                  roleLabel={roleLabel}
                  pendingAction={replyPending}
                  onReply={replyTicket}
                  onReopen={reopenTicket}
                />
              ) : (
                <div className="surface-flat">
                  <EmptyState icon={LifeBuoy} title="Select a ticket" description="Choose a ticket to view its timeline, reply or reopen it." />
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'guide' ? (
        <section aria-labelledby="faq-heading" className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="surface-flat p-4">
              <h2 id="faq-heading" className="text-[13px] font-medium text-ink">Frequently asked</h2>
              <div className="mt-2 divide-y divide-[var(--line)]">
                {faqs.map((faq, index) => (
                  <div key={faq.question} className="py-2">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                      aria-expanded={openFaq === index}
                    >
                      <span className="text-[12px] font-medium leading-snug text-ink">{faq.question}</span>
                      <ChevronDown className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-soft transition ${openFaq === index ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {openFaq === index ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{faq.answer}</p> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-sky p-4">
              <h2 className="text-[13px] font-medium text-[var(--sky-900)]">How AI Auto Support is different</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--sky-800)]">
                The AI Auto Support tab is a deterministic mock response service with local context. It cannot change an account, fee or attendance record. Admin Support creates a shared ticket that an administrator can answer, update and resolve.
              </p>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="surface p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" /> Support desk
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">Working days 9:00–18:00 IST. Include the examination, session or fee ID so the desk can trace the record.</p>
              <dl className="mt-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2"><dt className="text-muted">Email</dt><dd className="font-medium text-ink">support@vyuh.demo</dd></div>
                <div className="flex items-center justify-between gap-2"><dt className="text-muted">First response</dt><dd className="font-medium text-ink">Within 1 working day</dd></div>
                <div className="flex items-center justify-between gap-2"><dt className="text-muted">Channel</dt><dd className="font-medium text-ink">Shared in-app ticket</dd></div>
              </dl>
              <Button className="mt-3" variant="primary" size="sm" fullWidth icon={Mail} onClick={() => setTicketOpen(true)}>Contact support</Button>
            </div>
            <div className="surface-sunken p-4">
              <p className="text-[11px] font-medium text-ink">{guideTitle}</p>
              <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-muted">
                {(guideItems.length ? guideItems : [
                  'Describe the page, the action you took and what you expected.',
                  'Use attachment metadata for a filename and size; this demo does not upload files.',
                  'Reply in the same thread so the full decision history stays visible.',
                ]).map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Raise a support ticket"
        description="The ticket is shared with Admin Support. Attachment metadata is recorded locally; no file is uploaded."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTicketOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" type="submit" form={`${role}-support-form`} icon={Send} loading={submitting}>
              Submit ticket
            </Button>
          </div>
        }
      >
        <form id={`${role}-support-form`} className="space-y-3.5" onSubmit={submitTicket} noValidate>
          <Select
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            hint="Choose the closest match so the ticket reaches the right queue."
          >
            {SUPPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <TextInput
            label="Subject"
            value={form.subject}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            error={errors.subject}
            placeholder="One line describing the issue"
            required
          />
          <TextArea
            label="What happened?"
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            error={errors.message}
            rows={4}
            placeholder="Include the page, what you clicked and what you expected."
            required
          />
          <Field
            label="Optional attachment metadata"
            hint="Up to 5 filenames, types and sizes. This frontend demonstration does not upload file contents."
          >
            <div className="flex items-center gap-2">
              <label className="btn btn-secondary btn-sm cursor-pointer">
                <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Choose files
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    setForm((current) => ({ ...current, attachments: attachmentFiles(event.target.files) }))
                    event.target.value = ''
                  }}
                />
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] text-soft">
                <FileText className="h-3 w-3" aria-hidden="true" /> Metadata only
              </span>
            </div>
            <AttachmentList attachments={form.attachments} emptyHint="No files selected." />
          </Field>
          {form.attachments.length ? (
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-soft">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Do not attach passwords, full bank account numbers, card numbers, PINs or CVVs.
            </p>
          ) : null}
          <FormError>{formError}</FormError>
          <p className="text-[10px] text-soft">Raising a ticket is logged against {user.name} with a shared reference number.</p>
        </form>
      </Modal>
    </div>
  )
}

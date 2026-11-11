import { useMemo, useState } from 'react'
import { ChevronDown, LifeBuoy, Mail, MessageSquarePlus, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { supportService } from '../../services/support.service.js'
import { relativeTime } from '../../lib/time.js'
import { SUPPORT_CATEGORIES } from '../../data/mock/support.mock.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

const FAQS = [
  {
    question: 'Why does my exam timer keep running when I switch tabs?',
    answer:
      'The examination timer is server-authoritative in production. In this demonstration it is anchored to your attempt start time, so leaving the tab does not pause it. Leaving the tab is recorded as an integrity event — it does not, on its own, count as misconduct.',
  },
  {
    question: 'How is attendance calculated?',
    answer:
      'Eligible attended minutes divided by eligible class minutes, multiplied by 100. Join and leave events are merged so reconnecting during the same class never double-counts time. Minutes outside the eligible session window are excluded.',
  },
  {
    question: 'Why is my attendance below 60% even though I joined every class?',
    answer:
      'Partial attendance counts only the time you were connected. If you joined late or left early, the attended minutes are lower than the session length. Open the session record to see the exact intervals.',
  },
  {
    question: 'Can I download every recording?',
    answer:
      'Only where the institute policy allows downloads for your batch. Playback is always available once a recording is published.',
  },
  {
    question: 'Is the AI doubt assistant a real AI?',
    answer:
      'No. It is a demonstration assistant that returns contextual templates grounded in the Vyuh question bank. Answers do not come from a hosted language model and should be verified with faculty.',
  },
  {
    question: 'Where do I see my result and analysis?',
    answer:
      'Results appear after an attempt is submitted and evaluated. Open the examination from the Exams page and choose Result or Analysis.',
  },
]

export default function SupportPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [openFaq, setOpenFaq] = useState(0)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [form, setForm] = useState({ category: SUPPORT_CATEGORIES[0], subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, error, loading, refresh, setData } = useAsync(() => supportService.listForUser(user.id), [user.id])

  const faqs = useMemo(() => FAQS, [])

  const submit = async (event) => {
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
        { category: form.category, subject: form.subject, description: form.message, priority: 'normal' },
        { id: user.id, role: 'student', name: user.name },
      )
      setData((current) => ({ tickets: [ticket, ...(current?.tickets || [])] }))
      setTicketOpen(false)
      setForm({ category: SUPPORT_CATEGORIES[0], subject: '', message: '' })
      toast.success('Ticket raised', `Reference ${ticket.id} — the support desk will respond in-app.`)
    } catch (caught) {
      setFormError(caught?.message || 'The ticket could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Support"
        description="Answers to common questions, plus a direct channel to the institute support desk."
        actions={
          <Button size="sm" variant="primary" icon={MessageSquarePlus} onClick={() => setTicketOpen(true)}>
            Raise a ticket
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Frequently asked</h2>
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
                    <ChevronDown
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-soft transition ${openFaq === index ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {openFaq === index ? (
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{faq.answer}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Your tickets</h2>
            {loading ? (
              <div className="mt-2">
                <LoadingBlock rows={2} />
              </div>
            ) : error ? (
              <ErrorState error={error} onRetry={refresh} title="Tickets could not be loaded" compact />
            ) : !data?.tickets?.length ? (
              <EmptyState
                compact
                icon={LifeBuoy}
                title="No tickets raised"
                description="If something is not working, raise a ticket and it will be picked up by the support desk."
              />
            ) : (
              <ul className="mt-2 space-y-2">
                {data.tickets.map((ticket) => (
                  <li key={ticket.id} className="rounded-[10px] border border-[var(--line)] p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(ticket.status)} dot>
                        {statusLabel(ticket.status)}
                      </StatusBadge>
                      <span className="badge badge-outline">{ticket.categoryLabel || ticket.category}</span>
                      <span className="ml-auto font-mono text-[9.5px] text-soft">{ticket.id}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] font-medium text-ink">{ticket.subject}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{ticket.message}</p>
                    <p className="mt-1 text-[10px] text-soft">
                      Raised {relativeTime(ticket.createdAt)} · {ticket.replies?.length || 0} reply
                      {ticket.replies?.length === 1 ? '' : 'ies'}
                    </p>
                    {ticket.replies?.length ? (
                      <div className="mt-1.5 space-y-1.5 border-t border-[var(--line)] pt-1.5">
                        {ticket.replies.map((reply) => (
                          <div key={reply.id} className="text-[11px] leading-snug">
                            <span className="font-medium text-ink">{reply.authorName}</span>
                            <span className="ml-1 text-[10px] text-soft">{relativeTime(reply.at)}</span>
                            <p className="text-muted">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="surface p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" /> Support desk
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              The support desk is available on working days, 9:00–18:00 IST. Tickets are tracked with a reference ID and
              every reply stays in this thread.
            </p>
            <dl className="mt-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-ink">support@vyuh.demo</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">First response</dt>
                <dd className="font-medium text-ink">Within 1 working day</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted">Channel</dt>
                <dd className="font-medium text-ink">In-app ticket</dd>
              </div>
            </dl>
            <Button className="mt-3" variant="primary" size="sm" fullWidth icon={Mail} onClick={() => setTicketOpen(true)}>
              Contact support
            </Button>
          </section>

          <section className="surface-sunken p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Before you raise a ticket
            </p>
            <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-muted">
              <li>• Check the FAQ — most timer and attendance questions are answered there.</li>
              <li>• Note the examination or session ID so support can trace the record.</li>
              <li>• Connectivity interruptions are logged automatically; you do not need to report them.</li>
            </ul>
          </section>
        </aside>
      </div>

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Raise a support ticket"
        description="Describe the issue precisely; the support desk replies inside this workspace."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTicketOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="support-form" icon={Send} loading={submitting}>
              Submit ticket
            </Button>
          </div>
        }
      >
        <form id="support-form" className="space-y-3.5" onSubmit={submit} noValidate>
          <Select
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            hint="Choose the closest match so the ticket reaches the right queue."
          >
            {SUPPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
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
          <FormError>{formError}</FormError>
          <p className="text-[10px] text-soft">
            Raising a ticket is logged against your account ({user.name}) with a reference number.
          </p>
        </form>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { LifeBuoy, Mail, MessageSquarePlus, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { supportService } from '../../services/support.service.js'
import { SUPPORT_CATEGORIES } from '../../data/mock/support.mock.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

const FAQS = [
  {
    question: 'How do I publish an examination that needs approval?',
    answer:
      'Submit it for approval from the examination page. It moves to pending-approval and the administrator decides; on approval every student in the target batches is notified automatically.',
  },
  {
    question: 'Why can I not edit a published examination?',
    answer:
      'Published and completed papers are locked so candidates see a stable paper. Duplicate the examination to create an editable copy.',
  },
  {
    question: 'How is attendance computed for my sessions?',
    answer:
      'Eligible attended minutes divided by eligible class minutes. Join and leave events are paired and merged, so a student who reconnects is never double counted.',
  },
  {
    question: 'Can I correct a student attendance record directly?',
    answer:
      'No — corrections go through a request. The administrator approves it, and only then are the join/leave events rewritten and audited.',
  },
  {
    question: 'What happens to a session recording after class?',
    answer:
      'Ending a session queues the recording for processing. You publish it when the media is ready; downloads follow the institute policy.',
  },
]

export default function FacultySupportPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [ticketOpen, setTicketOpen] = useState(false)
  const [form, setForm] = useState({ category: SUPPORT_CATEGORIES[0], subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  const { data, error, loading, refresh, setData } = useAsync(() => supportService.listForUser(user.id), [user.id])

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
        { id: user.id, role: 'faculty', name: user.name },
      )
      setData((current) => ({ ...current, tickets: [ticket, ...(current?.tickets || [])] }))
      setTicketOpen(false)
      setForm({ category: SUPPORT_CATEGORIES[0], subject: '', message: '' })
      toast.success('Ticket raised', `Reference ${ticket.code || ticket.id}.`)
    } catch (caught) {
      setFormError(caught?.message || 'The ticket could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Support"
        description="Operational help with examinations, attendance and recordings."
        actions={
          <Button size="sm" variant="primary" icon={MessageSquarePlus} onClick={() => setTicketOpen(true)}>
            Raise a ticket
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Faculty FAQ</h2>
            <div className="mt-2 divide-y divide-[var(--line)]">
              {FAQS.map((faq, index) => (
                <div key={faq.question} className="py-2">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                    aria-expanded={openFaq === index}
                  >
                    <span className="text-[12px] font-medium leading-snug text-ink">{faq.question}</span>
                    <span className="mt-0.5 shrink-0 text-[10px] text-soft">{openFaq === index ? '−' : '+'}</span>
                  </button>
                  {openFaq === index ? <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{faq.answer}</p> : null}
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
              <EmptyState compact icon={LifeBuoy} title="No tickets raised" description="Raise a ticket if something blocks your teaching workflow." />
            ) : (
              <ul className="mt-2 space-y-2">
                {data.tickets.map((ticket) => (
                  <li key={ticket.id} className="rounded-[10px] border border-[var(--line)] p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(ticket.status)} dot>
                        {statusLabel(ticket.status)}
                      </StatusBadge>
                      <span className="badge badge-outline">{ticket.category}</span>
                      <span className="ml-auto font-mono text-[9.5px] text-soft">{ticket.code || ticket.id}</span>
                    </div>
                    <p className="mt-1 text-[12px] font-medium text-ink">{ticket.subject}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{ticket.message}</p>
                    <p className="mt-1 text-[10px] text-soft">
                      raised {relativeTime(ticket.createdAt)} · {ticket.replies?.length || 0} repl
                      {ticket.replies?.length === 1 ? 'y' : 'ies'}
                    </p>
                    {ticket.replies?.length ? (
                      <div className="mt-1.5 space-y-1 border-t border-[var(--line)] pt-1.5">
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
              Working days 9:00–18:00 IST. Include the examination or session ID so the desk can trace the record.
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
                <dt className="text-muted">Escalation</dt>
                <dd className="font-medium text-ink">Administrator inbox</dd>
              </div>
            </dl>
            <Button className="mt-3" variant="primary" size="sm" fullWidth icon={Mail} onClick={() => setTicketOpen(true)}>
              Contact support
            </Button>
          </section>

          <section className="surface-sunken p-4">
            <p className="text-[11px] font-medium text-ink">Before you raise a ticket</p>
            <ul className="mt-1 space-y-1 text-[10.5px] leading-snug text-muted">
              <li>• Check whether the record is locked by a published examination.</li>
              <li>• Attendance corrections use the request flow, not a ticket.</li>
              <li>• Recording processing can take a few minutes after a session ends.</li>
            </ul>
          </section>
        </aside>
      </div>

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Raise a support ticket"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setTicketOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="faculty-support-form" icon={Send} loading={submitting}>
              Submit ticket
            </Button>
          </div>
        }
      >
        <form id="faculty-support-form" onSubmit={submit} className="space-y-3.5" noValidate>
          <Select
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
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
            required
          />
          <TextArea
            label="What happened?"
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            error={errors.message}
            rows={4}
            required
          />
          <FormError>{formError}</FormError>
        </form>
      </Modal>
    </div>
  )
}

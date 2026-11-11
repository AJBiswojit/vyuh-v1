import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Flag, MessageSquare, PlayCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, Select, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const STATE_LABEL = {
  flagged: 'Flagged',
  restricted: 'Restricted',
  removed: 'Removed',
  clear: 'Cleared',
}

export default function AdminModerationPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [decisionFor, setDecisionFor] = useState(null)
  const [state, setState] = useState('clear')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const { data, error, loading, refresh } = useAsync(() => adminService.listModerationCases(), [])

  const cases = data || []

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    if (note.trim().length < 5) {
      setFormError('Record a moderation note of at least 5 characters. It is stored with the decision.')
      return
    }
    setSubmitting(true)
    try {
      await adminService.updateModerationCase(decisionFor.id, state, note.trim(), {
        id: user.id,
        role: 'admin',
        name: user.name,
      })
      toast.success('Case decided', `${decisionFor.title} — ${STATE_LABEL[state].toLowerCase()}`)
      setDecisionFor(null)
      setNote('')
      refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The decision could not be recorded.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Moderation" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Moderation" />
        <ErrorState error={error} onRetry={refresh} title="The moderation queue could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Moderation"
        description="Flagged recordings and doubts. Decisions are reversible except removal, which unpublishes the recording."
      />

      <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Moderation is a human judgement. Each decision is written to the audit log with your note, so a later reviewer
          sees the reasoning and not just the outcome.
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={ShieldCheck}
            title="Queue is clear"
            description="No recording or doubt is currently flagged. Student reports and faculty flags appear here."
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {cases.map((item) => {
            const open = expanded === item.id
            return (
              <article key={item.id} className="surface-flat overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.state === 'flagged' ? 'warn' : statusTone(item.state)} dot>
                        {STATE_LABEL[item.state] || item.state}
                      </StatusBadge>
                      <span className="badge badge-outline">
                        {item.kind === 'recording' ? (
                          <>
                            <PlayCircle className="mr-1 inline h-2.5 w-2.5" aria-hidden="true" /> Recording
                          </>
                        ) : (
                          <>
                            <MessageSquare className="mr-1 inline h-2.5 w-2.5" aria-hidden="true" /> Doubt
                          </>
                        )}
                      </span>
                      <span className="badge">{subjectName(item.subject)}</span>
                      <span className="text-[10px] text-soft">{relativeTime(item.at)}</span>
                    </div>
                    <h3 className="mt-1.5 text-[13px] font-medium text-ink">{item.title}</h3>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.reason}</p>
                    <p className="mt-1 text-[10.5px] text-soft">
                      Reported by {item.reportedBy}
                      {item.facultyName ? ` · ${item.facultyName}` : ''} · case {item.id}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={open ? ChevronUp : ChevronDown}
                      onClick={() => setExpanded(open ? null : item.id)}
                    >
                      {open ? 'Hide' : 'Context'}
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      icon={Flag}
                      onClick={() => {
                        setDecisionFor(item)
                        setState(item.state === 'flagged' ? 'clear' : item.state)
                        setNote('')
                        setFormError(null)
                      }}
                    >
                      Record decision
                    </Button>
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
                    <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
                      <div>
                        <dt className="label-xs">Entity</dt>
                        <dd className="text-ink">{item.entityId}</dd>
                      </div>
                      <div>
                        <dt className="label-xs">Kind</dt>
                        <dd className="text-ink capitalize">{item.kind}</dd>
                      </div>
                      <div>
                        <dt className="label-xs">Current state</dt>
                        <dd className="text-ink">{STATE_LABEL[item.state] || item.state}</dd>
                      </div>
                      <div>
                        <dt className="label-xs">Reported</dt>
                        <dd className="text-ink">{relativeTime(item.at)}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[10px] leading-relaxed text-soft">
                      Clearing restores the content for students. Restricting keeps it hidden from the batch without
                      deleting it. Removing takes the recording out of the workspace and unlinks it from the class.
                    </p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(decisionFor)}
        onClose={() => setDecisionFor(null)}
        title="Record a moderation decision"
        description={decisionFor?.title}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDecisionFor(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="moderation-form" loading={submitting}>
              Save decision
            </Button>
          </div>
        }
      >
        {decisionFor ? (
          <form id="moderation-form" onSubmit={submit} className="space-y-3">
            <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
              <p className="text-[11.5px] font-medium text-ink">{decisionFor.reason}</p>
              <p className="mt-0.5 text-[10.5px] text-soft">
                Reported by {decisionFor.reportedBy} · state {decisionFor.state}
              </p>
            </div>
            <Select label="Decision" value={state} onChange={(event) => setState(event.target.value)}>
              <option value="clear">Clear — restore for students</option>
              <option value="restricted">Restrict — hide but keep</option>
              <option value="removed">Remove — unpublish the content</option>
            </Select>
            <TextArea
              label="Moderation note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="What did you review, and why is this the right call?"
              required
            />
            <FormError>{formError}</FormError>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}

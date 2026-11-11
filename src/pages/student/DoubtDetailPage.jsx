import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Paperclip, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { doubtService } from '../../services/doubt.service.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

export default function DoubtDetailPage() {
  const { doubtId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const { data, error, loading, refresh, setData } = useAsync(() => doubtService.getDoubt(doubtId), [doubtId])

  const sendReply = async (event) => {
    event.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const updated = await doubtService.replyToDoubt(doubtId, reply.trim(), { id: user.id, role: 'student', name: user.name })
      setData(updated)
      setReply('')
      toast.success('Reply sent', 'Your faculty will see it in the doubt inbox.')
    } catch (caught) {
      toast.error('Reply not sent', caught?.message)
    } finally {
      setSending(false)
    }
  }

  const markResolved = async () => {
    const ok = await confirm({
      title: 'Mark this doubt as resolved?',
      description: 'Resolved doubts stop appearing in the faculty pending queue. You can still read the thread.',
      confirmLabel: 'Mark resolved',
    })
    if (!ok) return
    setPendingAction('resolve')
    try {
      const updated = await doubtService.setStatus(doubtId, 'resolved', { id: user.id, role: 'student' }, 'Student confirmed the explanation')
      setData(updated)
      toast.success('Doubt resolved', 'Thanks for confirming.')
    } catch (caught) {
      toast.error('Status not updated', caught?.message)
    } finally {
      setPendingAction(null)
    }
  }

  const reopen = async () => {
    setPendingAction('reopen')
    try {
      const updated = await doubtService.setStatus(doubtId, 'open', { id: user.id, role: 'student' }, 'Student reopened the doubt')
      setData(updated)
      toast.info('Doubt reopened', 'Your faculty can reply again.')
    } catch (caught) {
      toast.error('Status not updated', caught?.message)
    } finally {
      setPendingAction(null)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Doubt" title="Loading thread" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Doubt" title="Doubt" backTo="/student/doubts" backLabel="Doubts" />
        <ErrorState error={error} onRetry={refresh} title="This doubt could not be opened" />
      </div>
    )
  }

  const doubt = data

  return (
    <div className="mx-auto max-w-[860px]">
      <PageHeader
        eyebrow={`${subjectName(doubt.subjectId)} · ${doubt.topicName}`}
        title={doubt.title}
        backTo="/student/doubts"
        backLabel="Doubts"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={statusTone(doubt.status)} dot>
              {statusLabel(doubt.status)}
            </StatusBadge>
            {doubt.status === 'resolved' ? (
              <Button size="sm" variant="secondary" loading={pendingAction === 'reopen'} onClick={reopen}>
                Reopen
              </Button>
            ) : (
              <Button size="sm" variant="secondary" icon={CheckCircle2} loading={pendingAction === 'resolve'} onClick={markResolved}>
                Mark resolved
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-3">
          <article className="surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sky-800)] text-[10px] font-semibold text-white">
                {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </span>
              <div>
                <p className="text-[12px] font-medium text-ink">{user.name}</p>
                <p className="text-[10px] text-soft">You · asked {relativeTime(doubt.createdAt)}</p>
              </div>
            </div>
            <p className="mt-2.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-80">{doubt.body}</p>
            {doubt.attachment?.name ? (
              <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                <Paperclip className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
                <span className="text-[11px] text-ink">{doubt.attachment.name}</span>
                <span className="ml-auto text-[10px] text-soft">{doubt.attachment.size}</span>
              </div>
            ) : null}
          </article>

          {doubt.replies.map((item) => (
            <article
              key={item.id}
              className={`rounded-[14px] border p-4 ${
                item.authorRole === 'faculty' ? 'border-[var(--sky-200)] bg-[var(--sky-50)]' : 'border-[var(--line)] bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                    item.authorRole === 'faculty' ? 'bg-[var(--sky-300)] text-[#245268]' : 'bg-[var(--surface-sunken)] text-ink'
                  }`}
                >
                  {item.authorName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </span>
                <div>
                  <p className="text-[12px] font-medium text-ink">
                    {item.authorName} {item.authorRole === 'faculty' ? <span className="text-[10px] font-normal text-soft">· Faculty</span> : null}
                  </p>
                  <p className="text-[10px] text-soft">{relativeTime(item.at)}</p>
                </div>
                {item.aiDemo ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[var(--cream-100)] px-2 py-0.5 text-[9.5px] font-medium text-[#6b5c33]">
                    <Sparkles className="h-2.5 w-2.5" /> Demo AI draft
                  </span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-80">{item.body}</p>
            </article>
          ))}

          {doubt.status === 'resolved' ? (
            <div className="rounded-[12px] border border-[#cfe0c9] bg-[#f4f9f2] p-3 text-[11.5px] text-[#375f34]">
              This doubt is resolved. Reopen it if the explanation needs a follow-up.
            </div>
          ) : (
            <form onSubmit={sendReply} className="surface p-3.5">
              <label htmlFor="doubt-reply" className="label-xs">
                Add to the thread
              </label>
              <textarea
                id="doubt-reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                className="field-textarea mt-1"
                placeholder="Add the step you tried, or ask a follow-up question…"
                maxLength={1200}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-soft">{reply.length}/1200 characters</span>
                <Button size="sm" variant="primary" type="submit" icon={Send} disabled={!reply.trim()} loading={sending}>
                  Send reply
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-3">
          <section className="surface-flat p-3.5">
            <p className="text-[12px] font-medium text-ink">Thread details</p>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-2"><dt className="text-muted">Subject</dt><dd className="text-right font-medium text-ink">{subjectName(doubt.subjectId)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Topic</dt><dd className="text-right font-medium text-ink">{doubt.topicName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Faculty</dt><dd className="text-right font-medium text-ink">{doubt.faculty?.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Priority</dt><dd className="text-right font-medium capitalize text-ink">{doubt.priority}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Asked</dt><dd className="text-right font-medium text-ink">{formatDate(doubt.createdAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Replies</dt><dd className="text-right font-medium text-ink">{doubt.replies.length}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Last activity</dt><dd className="text-right font-medium text-ink">{relativeTime(doubt.lastActivityAt)}</dd></div>
            </dl>
          </section>

          <section className="surface-sunken p-3.5">
            <p className="text-[11px] font-medium text-ink">Response expectation</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Faculty reply within their office hours. Escalate a high-priority doubt if it blocks your revision — the
              status turns overdue after the SLA window in the faculty inbox.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

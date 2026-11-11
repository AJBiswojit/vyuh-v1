import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, CornerDownRight, Paperclip, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { doubtService } from '../../services/doubt.service.js'
import { useToast, useConfirm } from '../../ui/feedback.jsx'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { Checkbox } from '../../ui/fields.jsx'

export default function FacultyDoubtDetailPage() {
  const { doubtId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [reply, setReply] = useState('')
  const [resolveAfterReply, setResolveAfterReply] = useState(false)
  const [sending, setSending] = useState(false)

  const { data, error, loading, refresh, setData } = useAsync(() => doubtService.getDoubt(doubtId), [doubtId])

  const send = async (event) => {
    event.preventDefault()
    if (reply.trim().length < 10) {
      toast.error('Reply too short', 'Write at least 10 characters so the student can follow your reasoning.')
      return
    }
    setSending(true)
    try {
      const updated = await doubtService.replyToDoubt(
        doubtId,
        reply.trim(),
        { id: user.id, role: 'faculty', name: user.name },
        { resolve: resolveAfterReply },
      )
      setData(updated)
      setReply('')
      setResolveAfterReply(false)
      toast.success(resolveAfterReply ? 'Reply sent and doubt resolved' : 'Reply sent', 'The student has been notified.')
    } catch (caught) {
      toast.error('Reply not sent', caught?.message)
    } finally {
      setSending(false)
    }
  }

  const markResolved = async () => {
    const ok = await confirm({
      title: 'Mark this doubt resolved?',
      description: 'Use this when the thread no longer needs a reply. The student can reopen it.',
      confirmLabel: 'Mark resolved',
    })
    if (!ok) return
    try {
      const updated = await doubtService.setStatus(
        doubtId,
        'resolved',
        { id: user.id, role: 'faculty', name: user.name },
        'Resolved by faculty after the explanation',
      )
      setData(updated)
      toast.success('Doubt resolved')
    } catch (caught) {
      toast.error('Status not updated', caught?.message)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Doubt" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Doubt" backTo="/faculty/doubts" backLabel="Doubts" />
        <ErrorState error={error} onRetry={refresh} title="This doubt could not be opened" />
      </div>
    )
  }

  const doubt = data
  const resolved = doubt.status === 'resolved'

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader
        eyebrow={`${subjectName(doubt.subjectId)} · ${doubt.topicName}`}
        title={doubt.title}
        backTo="/faculty/doubts"
        backLabel="Doubts"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={statusTone(doubt.status)} dot>
              {statusLabel(doubt.status)}
            </StatusBadge>
            {!resolved ? (
              <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={markResolved}>
                Mark resolved
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <article className="surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[10px] font-semibold text-ink">
                {(doubt.student?.name || 'S').split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </span>
              <div>
                <p className="text-[12px] font-medium text-ink">{doubt.student?.name}</p>
                <p className="text-[10px] text-soft">
                  {doubt.batch?.name} · asked {relativeTime(doubt.createdAt)}
                </p>
              </div>
              {doubt.priority === 'high' ? <StatusBadge tone="danger">High priority</StatusBadge> : null}
            </div>
            <p className="mt-2.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-80">{doubt.body}</p>
            {doubt.attachments?.length ? (
              <ul className="mt-2 space-y-1">
                {doubt.attachments.map((attachment) => (
                  <li key={attachment.name} className="flex items-center gap-2 text-[11px] text-muted">
                    <Paperclip className="h-3 w-3" aria-hidden="true" /> {attachment.name}
                  </li>
                ))}
              </ul>
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
                <span className="text-[12px] font-medium text-ink">{item.authorName}</span>
                <span className="text-[10px] text-soft">
                  {item.authorRole === 'faculty' ? 'Faculty' : 'Student'} · {relativeTime(item.at)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-80">{item.body}</p>
            </article>
          ))}

          {resolved ? (
            <div className="rounded-[12px] border border-[#cfe0c9] bg-[#f4f9f2] p-3 text-[11.5px] text-[#375f34]">
              Resolved. The student can reopen the thread if the explanation needs a follow-up.
            </div>
          ) : (
            <form onSubmit={send} className="surface p-3.5">
              <label htmlFor="faculty-reply" className="label-xs">
                Your reply
              </label>
              <textarea
                id="faculty-reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={4}
                className="field-textarea mt-1"
                placeholder="Explain the concept step by step. Point at the exact step where the student went wrong."
                maxLength={1600}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    label="Resolve after sending"
                    checked={resolveAfterReply}
                    onChange={(event) => setResolveAfterReply(event.target.checked)}
                  />
                  <span className="text-[10px] text-soft">{reply.length}/1600</span>
                </div>
                <Button size="sm" variant="primary" type="submit" icon={Send} loading={sending} disabled={reply.trim().length < 10}>
                  Send reply
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-3">
          <section className="surface-flat p-3.5">
            <p className="text-[12px] font-medium text-ink">Doubt details</p>
            <dl className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between gap-2"><dt className="text-muted">Student</dt><dd className="text-right font-medium text-ink">{doubt.student?.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Batch</dt><dd className="text-right font-medium text-ink">{doubt.batch?.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Subject</dt><dd className="text-right font-medium text-ink">{subjectName(doubt.subjectId)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Topic</dt><dd className="text-right font-medium text-ink">{doubt.topicName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Asked</dt><dd className="text-right font-medium text-ink">{formatDate(doubt.createdAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Replies</dt><dd className="text-right font-medium text-ink">{doubt.replies.length}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Last activity</dt><dd className="text-right font-medium text-ink">{relativeTime(doubt.lastActivityAt)}</dd></div>
            </dl>
          </section>

          <section className="surface-sunken p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Reply guidance
            </p>
            <ul className="mt-1 space-y-1 text-[10.5px] leading-snug text-muted">
              <li>• Address the step where the reasoning breaks, not just the final answer.</li>
              <li>• Link the idea back to a worked example from the question bank.</li>
              <li>• Keep it to a few short paragraphs; students read on mobile.</li>
            </ul>
          </section>

          {doubt.replies.length ? (
            <section className="surface-flat p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
                <CornerDownRight className="h-3 w-3" aria-hidden="true" /> Thread activity
              </p>
              <p className="mt-1 text-[10.5px] text-muted">
                {doubt.replies.filter((item) => item.authorRole === 'faculty').length} faculty{' '}
                {doubt.replies.filter((item) => item.authorRole === 'faculty').length === 1 ? 'reply' : 'replies'} ·{' '}
                {doubt.replies.filter((item) => item.authorRole !== 'faculty').length} student{' '}
                {doubt.replies.filter((item) => item.authorRole !== 'faculty').length === 1 ? 'message' : 'messages'}
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

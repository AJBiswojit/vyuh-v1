import { useMemo, useState } from 'react'
import {
  Download,
  Eye,
  Lock,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Upload,
  Video,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { recordingService } from '../../services/recording.service.js'
import { batchService } from '../../services/batch.service.js'
import { SUBJECTS, subjectName } from '../../data/mock/subjects.mock.js'
import { formatDate, formatDuration, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Checkbox, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

const DEMO_MEDIA = '/media/video/recording-rotational-dynamics.mp4'

export default function FacultyRecordingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    batchId: '',
    subjectId: SUBJECTS[0].id,
    allowDownload: false,
    durationSeconds: 17,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const { data, error, loading, refresh, setData } = useAsync(async () => {
    const [recordings, batches] = await Promise.all([
      recordingService.listRecordings({ facultyId: user.id }),
      batchService.listBatches({ status: 'active' }),
    ])
    return { recordings, batches }
  }, [user.id])

  const visible = useMemo(() => {
    if (!data) return []
    return status === 'all' ? data.recordings : data.recordings.filter((recording) => recording.status === status)
  }, [data, status])

  const openUpload = () => {
    setForm((current) => ({ ...current, batchId: current.batchId || data?.batches?.[0]?.id || '' }))
    setUploadOpen(true)
    setErrors({})
    setFormError(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    const next = {}
    if (String(form.title).trim().length < 5) next.title = 'Give the recording a clear title (at least 5 characters).'
    if (!form.batchId) next.batchId = 'Choose the batch that can watch this recording.'
    if (!form.subjectId) next.subjectId = 'Choose the subject.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    try {
      const created = await recordingService.uploadRecording(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          batchId: form.batchId,
          subjectId: form.subjectId,
          videoUrl: DEMO_MEDIA,
          allowDownload: form.allowDownload,
          durationSeconds: Number(form.durationSeconds) || 17,
        },
        { id: user.id, role: 'faculty', name: user.name },
      )
      setData((current) => ({ ...current, recordings: [created, ...current.recordings] }))
      setUploadOpen(false)
      setForm({ title: '', description: '', batchId: '', subjectId: SUBJECTS[0].id, allowDownload: false, durationSeconds: 17 })
      toast.success('Recording uploaded', 'It is saved as a draft. Publish it when you are happy with the media.')
    } catch (caught) {
      setFormError(caught?.message || 'The recording could not be uploaded.')
    } finally {
      setSaving(false)
    }
  }

  const replace = (updated) =>
    setData((current) => ({
      ...current,
      recordings: current.recordings.map((recording) => (recording.id === updated.id ? updated : recording)),
    }))

  const publish = async (recording) => {
    setBusyId(recording.id)
    try {
      const updated = await recordingService.publishRecording(recording.id, { id: user.id, role: 'faculty', name: user.name })
      replace(updated)
      toast.success('Recording published', 'Students in the batch have been notified.')
    } catch (caught) {
      toast.error('Could not publish', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  const unpublish = async (recording) => {
    const ok = await confirm({
      title: 'Unpublish this recording?',
      description: 'Students lose playback immediately. The media file is kept and can be published again.',
      confirmLabel: 'Unpublish',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(recording.id)
    try {
      const updated = await recordingService.unpublishRecording(
        recording.id,
        'Unpublished by faculty for revision',
        { id: user.id, role: 'faculty', name: user.name },
      )
      replace(updated)
      toast.info('Recording unpublished')
    } catch (caught) {
      toast.error('Could not unpublish', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  const toggleDownload = async (recording) => {
    setBusyId(recording.id)
    try {
      const updated = await recordingService.setDownloadPermission(
        recording.id,
        !recording.allowDownload,
        { id: user.id, role: 'faculty', name: user.name },
      )
      replace(updated)
      toast.success(updated.allowDownload ? 'Downloads enabled' : 'Downloads disabled')
    } catch (caught) {
      toast.error('Could not change the policy', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (recording) => {
    const ok = await confirm({
      title: 'Remove this recording?',
      description: 'Students lose access permanently and the class record is unlinked from this media.',
      confirmLabel: 'Remove recording',
      tone: 'danger',
      details: [{ label: 'Views', value: String(recording.views) }],
    })
    if (!ok) return
    setBusyId(recording.id)
    try {
      await recordingService.deleteRecording(recording.id, { id: user.id, role: 'faculty', name: user.name })
      toast.info('Recording removed')
      refresh()
    } catch (caught) {
      toast.error('Could not remove', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Recordings" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Recordings" />
        <ErrorState error={error} onRetry={refresh} title="Recordings could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Recordings"
        description="Session recordings for your batches. Publishing notifies students; download permission follows institute policy."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button size="sm" variant="primary" icon={Upload} onClick={openUpload}>
              Upload recording
            </Button>
          </div>
        }
      />

      <div className="tab-row mb-4" role="tablist" aria-label="Recording status">
        {[
          { id: 'all', label: 'All' },
          { id: 'draft', label: 'Drafts' },
          { id: 'processing', label: 'Processing' },
          { id: 'published', label: 'Published' },
          { id: 'unpublished', label: 'Unpublished' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={status === item.id}
            className="tab"
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={Video}
            title="No recordings in this view"
            description="Session recordings appear here when a class ends, or upload existing media directly."
            action={
              <Button size="sm" variant="primary" icon={Upload} onClick={openUpload}>
                Upload recording
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((recording) => (
            <article key={recording.id} className="surface-flat p-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="relative h-[68px] w-[118px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-sunken)]">
                  {recording.videoUrl ? (
                    <video src={recording.videoUrl} poster={recording.posterUrl} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-soft">
                      <PlayCircle className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 text-[9px] text-white">
                    {formatDuration(recording.durationSeconds)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={statusTone(recording.status)} dot>
                      {statusLabel(recording.status)}
                    </StatusBadge>
                    <span className="badge">{subjectName(recording.subjectId)}</span>
                    <span className="badge badge-outline">{recording.batch?.name}</span>
                    {recording.moderationState === 'flagged' ? (
                      <StatusBadge tone="warn">
                        <ShieldAlert className="mr-1 inline h-2.5 w-2.5" /> Flagged
                      </StatusBadge>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-[13px] font-medium text-ink">{recording.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{recording.description}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-soft">
                    <span>uploaded {relativeTime(recording.createdAt)}</span>
                    {recording.publishedAt ? <span>published {formatDate(recording.publishedAt)}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" aria-hidden="true" /> {recording.views} views
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {recording.allowDownload ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                      {recording.allowDownload ? 'Downloadable' : 'Playback only'}
                    </span>
                    {recording.classId ? <span>{recording.classId}</span> : null}
                  </p>
                  {recording.processingNote ? (
                    <p className="mt-1 rounded-[6px] bg-[var(--cream-100)] px-2 py-1 text-[10px] text-[#7a6220]">
                      {recording.processingNote}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {recording.status === 'draft' || recording.status === 'unpublished' || recording.status === 'processing' ? (
                    <Button
                      size="xs"
                      variant="primary"
                      loading={busyId === recording.id}
                      onClick={() => publish(recording)}
                      disabled={!recording.videoUrl}
                    >
                      Publish
                    </Button>
                  ) : null}
                  {recording.status === 'published' ? (
                    <Button size="xs" variant="secondary" loading={busyId === recording.id} onClick={() => unpublish(recording)}>
                      Unpublish
                    </Button>
                  ) : null}
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={recording.allowDownload ? Lock : Download}
                    loading={busyId === recording.id}
                    onClick={() => toggleDownload(recording)}
                  >
                    {recording.allowDownload ? 'Block downloads' : 'Allow downloads'}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => remove(recording)}>
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload a recording"
        description="This demonstration links the bundled sample media so playback and download really work."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="upload-recording" loading={saving}>
              Save as draft
            </Button>
          </div>
        }
      >
        <form id="upload-recording" onSubmit={submit} className="space-y-3.5" noValidate>
          <TextInput
            label="Title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            error={errors.title}
            required
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            hint="Shown to students under the video."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Batch"
              value={form.batchId}
              onChange={(event) => setForm((current) => ({ ...current, batchId: event.target.value }))}
              error={errors.batchId}
              required
            >
              <option value="">Select a batch</option>
              {data.batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} · {batch.section}
                </option>
              ))}
            </Select>
            <Select
              label="Subject"
              value={form.subjectId}
              onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
              error={errors.subjectId}
              required
            >
              {SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-[10px] border border-dashed border-[var(--line-strong)] p-3">
            <p className="text-[11.5px] font-medium text-ink">Media file</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
              Real video upload needs object storage. For this demonstration the bundled sample file is attached, so the
              player and download behave exactly as they will with a real asset.
            </p>
            <p className="mt-1 font-mono text-[10px] text-soft">{DEMO_MEDIA}</p>
          </div>
          <Checkbox
            label="Allow students to download"
            checked={form.allowDownload}
            onChange={(event) => setForm((current) => ({ ...current, allowDownload: event.target.checked }))}
            description="Downloads are always subject to the institute policy."
          />
          <FormError>{formError}</FormError>
        </form>
      </Modal>
    </div>
  )
}

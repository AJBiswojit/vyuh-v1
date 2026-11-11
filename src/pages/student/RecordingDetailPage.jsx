import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeft, Download, Gauge, PlayCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { recordingService } from '../../services/recording.service.js'
import { formatDate, formatDuration, relativeTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { useToast } from '../../ui/feedback.jsx'
import Button from '../../ui/Button.jsx'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function RecordingDetailPage() {
  const { recordingId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const videoRef = useRef(null)
  const [speed, setSpeed] = useState(1)
  const [downloading, setDownloading] = useState(false)

  const { data, error, loading, refresh } = useAsync(
    () => recordingService.getRecording(recordingId, { id: user.id, role: 'student' }),
    [recordingId, user.id],
  )

  useEffect(() => {
    if (!data) return
    recordingService.registerView(data.id).catch(() => {})
  }, [data])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed, data])

  const download = async () => {
    setDownloading(true)
    try {
      const file = await recordingService.prepareDownload(recordingId, { id: user.id, role: 'student' })
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started', file.filename)
    } catch (caught) {
      toast.error('Download unavailable', caught?.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Recording" title="Loading" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Recording" title="Recording" backTo="/student/recordings" backLabel="Recordings" />
        <ErrorState error={error} onRetry={refresh} title="This recording could not be opened" />
      </div>
    )
  }

  const recording = data

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        eyebrow={`${subjectName(recording.subjectId)} · ${recording.batch?.name}`}
        title={recording.title}
        description={recording.description}
        backTo="/student/recordings"
        backLabel="Recordings"
        actions={
          recording.allowDownload ? (
            <Button size="sm" variant="primary" icon={Download} loading={downloading} onClick={download}>
              Download
            </Button>
          ) : (
            <StatusBadge tone="neutral">Playback only</StatusBadge>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[16px] border border-[var(--line)] bg-black">
            {recording.videoUrl ? (
              <video
                ref={videoRef}
                src={recording.videoUrl}
                poster={recording.posterUrl}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black"
              >
                Your browser cannot play this recording.
              </video>
            ) : (
              <div className="flex aspect-video items-center justify-center text-white/60">Media not available</div>
            )}
          </div>

          <div className="surface-flat flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
              <span className="text-[11px] text-muted">Playback speed</span>
              <div className="flex items-center gap-0.5">
                {SPEEDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpeed(value)}
                    className={`rounded-full px-2 py-0.5 text-[10.5px] transition ${
                      speed === value ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)] hover:text-[var(--sky-900)]'
                    }`}
                    aria-pressed={speed === value}
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10.5px] text-soft">
              Resume works automatically: the player remembers your position within this browsing session.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Recording details</h2>
            <dl className="mt-2.5 space-y-2 text-[11.5px]">
              {[
                { label: 'Faculty', value: recording.faculty?.name },
                { label: 'Subject', value: subjectName(recording.subjectId) },
                { label: 'Batch', value: recording.batch?.name },
                { label: 'Duration', value: formatDuration(recording.durationSeconds) },
                { label: 'Published', value: `${formatDate(recording.publishedAt)} · ${relativeTime(recording.publishedAt)}` },
                { label: 'Views', value: recording.views },
                { label: 'Downloads', value: recording.allowDownload ? 'Allowed by policy' : 'Not permitted' },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="text-right font-medium text-ink">{item.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="surface-sunken p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> About downloads
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Downloads are served from the local <code className="font-mono text-[10px]">/media</code> folder. Recording
              downloads respect the institute policy set by the administrator — not every recording allows offline access.
            </p>
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Continue learning
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              This session is linked to live class{' '}
              <span className="font-medium text-ink">{recording.classId || 'standalone upload'}</span>. Attendance for the
              session is available on the Attendance page.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

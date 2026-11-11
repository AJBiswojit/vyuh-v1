import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Download, PlayCircle, Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { recordingService } from '../../services/recording.service.js'
import { batchService } from '../../services/batch.service.js'
import { formatDate, formatDuration } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, EmptyState, SkeletonCards } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { useToast } from '../../ui/feedback.jsx'

export default function RecordingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('all')

  const { data, error, loading, refresh } = useAsync(async () => {
    const [recordings, subjects] = await Promise.all([
      recordingService.listRecordings({ forStudentId: user.id }),
      batchService.listSubjects(),
    ])
    return { recordings, subjects }
  }, [user.id])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.recordings.filter((recording) => {
      const matchesSubject = subject === 'all' || recording.subjectId === subject
      const needle = search.trim().toLowerCase()
      const matchesSearch =
        !needle || recording.title.toLowerCase().includes(needle) || recording.description.toLowerCase().includes(needle)
      return matchesSubject && matchesSearch
    })
  }, [data, search, subject])

  const download = async (recording) => {
    try {
      const file = await recordingService.prepareDownload(recording.id, { id: user.id, role: 'student' })
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started', `${file.filename} is saving from the local demo media folder.`)
    } catch (caught) {
      toast.error('Download unavailable', caught?.message)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Recordings"
        description="Every published session recording for your batch. Playback and downloads use real local media files."
      />

      <div className="surface-flat mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recordings…"
            className="field-input pl-8"
            aria-label="Search recordings"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
          <select value={subject} onChange={(event) => setSubject(event.target.value)} className="field-select w-auto" aria-label="Filter by subject">
            <option value="all">All subjects</option>
            {(data?.subjects || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-soft">
          {filtered.length} of {data?.recordings.length || 0} recordings
        </p>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="Recordings could not be loaded" />
      ) : filtered.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={PlayCircle}
            title="No recordings available"
            description="When your faculty publishes a session recording for your batch, it appears here with playback and download controls."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recording) => (
            <article key={recording.id} className="surface-flat overflow-hidden transition hover:border-[var(--line-strong)]">
              <Link to={`/student/recordings/${recording.id}`} className="group relative block">
                <img src={recording.posterUrl} alt="" className="h-[132px] w-full object-cover" loading="lazy" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                  <PlayCircle className="h-8 w-8 text-white" />
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {formatDuration(recording.durationSeconds)}
                </span>
                {recording.kind === 'audio' ? (
                  <span className="absolute left-2 top-2 rounded bg-[var(--cream-200)] px-1.5 py-0.5 text-[9.5px] font-medium text-[#6b5c33]">
                    Audio lesson
                  </span>
                ) : null}
              </Link>
              <div className="p-3.5">
                <div className="flex items-center gap-1.5">
                  <StatusBadge tone="sky">{subjectName(recording.subjectId)}</StatusBadge>
                  <span className="text-[10px] text-soft">{formatDate(recording.publishedAt)}</span>
                </div>
                <h3 className="mt-1.5 text-[13px] font-medium leading-snug text-ink clamp-2">{recording.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted clamp-2">{recording.description}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
                  <span className="flex items-center gap-1 text-[10.5px] text-soft">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {recording.faculty?.name}
                  </span>
                  {recording.allowDownload ? (
                    <button
                      type="button"
                      onClick={() => download(recording)}
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-link hover:underline"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  ) : (
                    <span className="text-[10px] text-soft">Playback only</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

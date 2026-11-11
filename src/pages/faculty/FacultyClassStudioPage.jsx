import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Hand,
  Mic,
  MicOff,
  MessageSquare,
  MonitorUp,
  PhoneOff,
  Presentation,
  Radio,
  Send,
  Sparkles,
  Square,
  Users,
  Video as VideoIcon,
  VideoOff,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import useLocalMedia from '../../lib/useLocalMedia.js'
import useClassroomSession from '../../layouts/classroom/useClassroomSession.js'
import { formatTime, relativeTime } from '../../lib/time.js'
import { useConfirm, useToast } from '../../ui/feedback.jsx'
import { ErrorState, LoadingBlock, Drawer, EmptyState } from '../../ui/states.jsx'
import Button from '../../ui/Button.jsx'

function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const POLL_TEMPLATE = {
  question: 'Which concept should we revise next?',
  options: ['Rotational dynamics', 'Work–energy theorem', 'Electrostatics', 'Ray optics'],
}

export default function FacultyClassStudioPage({ classId, onExit, embedded = false }) {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const media = useLocalMedia()

  const [joined, setJoined] = useState(false)
  const [panel, setPanel] = useState('chat')
  const [chatText, setChatText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [pollQuestion, setPollQuestion] = useState(POLL_TEMPLATE.question)
  const [pollOptions, setPollOptions] = useState(POLL_TEMPLATE.options)
  const [pollOpen, setPollOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [networkDropped, setNetworkDropped] = useState(false)
  const [busy, setBusy] = useState(null)
  const joinedAtRef = useRef(null)
  const chatEndRef = useRef(null)

  const { data, error, loading, refresh } = useAsync(
    () => liveClassService.getClass(classId),
    [classId],
  )

  const roster = useAsync(
    () => (data?.batchId ? liveClassService.getRoster(data.batchId) : Promise.resolve([])),
    [data?.batchId],
  )

  const session = useClassroomSession({
    sessionId: data?.sessionId || classId,
    role: 'faculty',
    selfId: user.id,
    selfName: user.name,
    host: { id: user.id, name: user.name },
    studentIds: (roster.data || []).map((student) => ({ id: student.id, name: student.name })),
    batchId: data?.batchId,
  })

  useEffect(() => {
    if (!joined) return
    const interval = setInterval(() => setElapsed(Math.round((Date.now() - joinedAtRef.current) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [joined])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session.messages.length, panel])

  const start = useCallback(async () => {
    setBusy('start')
    try {
      await liveClassService.startSession(classId, { id: user.id, role: 'faculty', name: user.name })
      setJoined(true)
      joinedAtRef.current = Date.now()
      refresh()
      toast.success('Session started', 'Students in your batch can now join the classroom.')
    } catch (caught) {
      toast.error('Session could not start', caught?.message)
    } finally {
      setBusy(null)
    }
  }, [classId, refresh, toast, user.id, user.name, user.role])

  const end = async () => {
    const ok = await confirm({
      title: 'End this session?',
      description:
        'Students are disconnected, attendance is finalised from the recorded join/leave events, and the session moves to recording processing.',
      confirmLabel: 'End session',
      tone: 'danger',
      details: [
        { label: 'Duration', value: formatElapsed(elapsed) },
        { label: 'Participants', value: String(session.participants.length) },
      ],
    })
    if (!ok) return
    setBusy('end')
    try {
      await liveClassService.endSession(classId, { id: user.id, role: 'faculty', name: user.name })
      media.stopAll()
      toast.success('Session ended', 'Attendance has been finalised and the recording is processing.')
      refresh()
      onExit?.()
    } catch (caught) {
      toast.error('Could not end the session', caught?.message)
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (!joined) return
    const timer = setTimeout(() => {
      setNetworkDropped(true)
      setTimeout(() => setNetworkDropped(false), 3800)
    }, 45000)
    return () => clearTimeout(timer)
  }, [joined])

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingBlock label="Loading session" rows={3} />
      </div>
    )
  }

  if (error) {
    return <ErrorState error={error} onRetry={refresh} title="This session could not be opened" />
  }

  const klass = data
  const isLive = klass.status === 'live'
  const isFinished = ['ended', 'recording-processing', 'recording-published'].includes(klass.status)
  const activePoll = session.polls[session.polls.length - 1]

  const launchPoll = (event) => {
    event.preventDefault()
    const options = pollOptions.map((option) => option.trim()).filter(Boolean)
    if (!pollQuestion.trim() || options.length < 2) {
      toast.error('Poll needs a question and two options')
      return
    }
    session.startPoll({ id: `poll_${Date.now()}`, question: pollQuestion.trim(), options })
    setPollOpen(false)
    setPanel('polls')
    toast.success('Poll launched', 'Students see it in the classroom panel.')
  }

  /* ------------------------------- lobby ------------------------------- */
  if (!joined && !isLive) {
    return (
      <div className="space-y-3">
        <div className="surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-xs">Faculty studio</p>
              <h2 className="mt-1 text-[17px] font-medium text-ink">{klass.title}</h2>
              <p className="mt-1 text-[11.5px] text-muted">
                {klass.batch?.name} · {klass.durationMinutes} min · scheduled {formatTime(klass.scheduledStartAt)} –{' '}
                {formatTime(klass.scheduledEndAt)}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={refresh} loading={busy === 'start'}>
              Refresh status
            </Button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Enrolled', value: klass.participantCount },
              { label: 'Attendance records', value: klass.attendanceRecords?.length || 0 },
              { label: 'Recording', value: klass.recordingEnabled ? 'On' : 'Off' },
            ].map((item) => (
              <div key={item.label} className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2">
                <p className="label-xs">{item.label}</p>
                <p className="mt-0.5 text-[14px] font-medium text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          {isFinished ? (
            <div className="mt-4 rounded-[10px] border border-[var(--line)] p-3">
              <p className="text-[12px] font-medium text-ink">This session has ended</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Attendance is final and the recording is available from the recordings workspace.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[10px] border border-[var(--line)] p-3">
              <p className="text-[12px] font-medium text-ink">Ready to go live?</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Starting the session notifies the batch, opens the classroom for students and begins the session clock used
                for attendance.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" loading={busy === 'start'} onClick={start}>
                  Start session
                </Button>
                <Button size="sm" variant="ghost" onClick={() => media.requestMedia().then(() => media.stopAll())}>
                  Test camera &amp; microphone
                </Button>
              </div>
              {media.error ? (
                <p className="mt-2 rounded-[8px] bg-[var(--cream-100)] px-2.5 py-2 text-[11px] text-[#7a6220]">{media.error}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ------------------------------- active ------------------------------- */
  return (
    <div className={embedded ? '' : 'exam-viewport'}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3ecec] px-2 py-0.5 text-[10px] font-medium text-[#8c2f2f]">
            <span className="dot bg-[#9d3c3c]" /> LIVE
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{klass.title}</p>
            <p className="truncate text-[10px] leading-tight text-soft">
              {klass.batch?.name} · {klass.subject?.name}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1 text-[10.5px] text-muted sm:inline-flex">
            {networkDropped ? <WifiOff className="h-3.5 w-3.5 text-[#8c2f2f]" /> : <Wifi className="h-3.5 w-3.5 text-[#375f34]" />}
            {networkDropped ? 'Reconnecting…' : 'Stable'}
          </span>
          <span className="tabular text-[11.5px] text-ink">{formatElapsed(elapsed)}</span>
          <Button size="xs" variant="secondary" onClick={() => setRosterOpen(true)}>
            <Users className="h-3 w-3" /> {session.participants.length}
          </Button>
          <Button size="xs" variant="secondary" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button size="xs" variant="danger" icon={PhoneOff} loading={busy === 'end'} onClick={end}>
            End
          </Button>
        </div>
      </header>

      <div className="exam-body">
        <div className="flex min-h-0 flex-col">
          <div className="stage-dark stage-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div className="w-full max-w-[720px] px-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-[14px] border border-white/10 bg-black/40">
                <video ref={media.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Faculty camera preview" />
                {!media.cameraOn ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/55">
                    <VideoOff className="h-7 w-7" aria-hidden="true" />
                    <p className="text-[11.5px]">Camera preview off</p>
                    <p className="max-w-[300px] text-center text-[10px] text-white/40">
                      Enable the camera to check your framing. Media never leaves this device — there is no signalling
                      server.
                    </p>
                  </div>
                ) : null}
                <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                  {user.name} · Host
                </span>
                {media.screenSharing ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--sky-300)] px-2 py-0.5 text-[10px] font-medium text-[#245268]">
                    <Presentation className="h-3 w-3" /> Screen share (local)
                  </span>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {session.participants.slice(0, 4).map((participant) => (
                  <div key={participant.id} className="rounded-[9px] bg-white/5 px-2 py-1.5">
                    <p className="truncate text-[10.5px] text-white/85">{participant.name}</p>
                    <p className="text-[9px] text-white/40">{participant.handRaised ? 'Hand raised' : participant.connection}</p>
                  </div>
                ))}
                {session.participants.length > 4 ? (
                  <div className="rounded-[9px] bg-white/5 px-2 py-1.5 text-[10px] text-white/60">
                    +{session.participants.length - 4} more
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-[var(--line)] bg-white px-3 py-2">
            <button
              type="button"
              onClick={media.toggleMic}
              aria-pressed={media.micOn}
              aria-label={media.micOn ? 'Mute microphone' : 'Unmute microphone'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                media.micOn ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
            >
              {media.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={media.toggleCamera}
              aria-pressed={media.cameraOn}
              aria-label={media.cameraOn ? 'Turn camera off' : 'Turn camera on'}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                media.cameraOn ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
            >
              {media.cameraOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => (media.screenSharing ? media.stopScreenShare() : media.startScreenShare())}
              aria-pressed={media.screenSharing}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] transition ${
                media.screenSharing ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
            >
              <MonitorUp className="h-3.5 w-3.5" /> {media.screenSharing ? 'Stop share' : 'Share screen'}
            </button>
            <button
              type="button"
              onClick={() => setPollOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-white px-3 text-[11px] text-ink transition"
            >
              <Radio className="h-3.5 w-3.5" /> Poll
            </button>
            <button
              type="button"
              onClick={() => {
                if (activePoll && !activePoll.ended) {
                  session.endPoll(activePoll.id)
                  toast.info('Poll closed', `${activePoll.votes.length} responses recorded.`)
                } else {
                  setPanel('polls')
                  toast.info('No open poll', 'Launch a poll from the toolbar.')
                }
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-white px-3 text-[11px] text-ink transition"
            >
              <Square className="h-3 w-3" /> Close poll
            </button>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-soft">
              <span>{roster.data?.length ? `${roster.data.length} enrolled` : `${session.participants.length} connected`}</span>
              <span>·</span>
              <span>Session {klass.sessionId}</span>
            </div>
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] bg-white lg:flex">
          <div className="tab-row shrink-0 px-2" role="tablist" aria-label="Studio panels">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'participants', label: 'People', icon: Users },
              { id: 'polls', label: 'Polls', icon: Radio },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={panel === item.id}
                  className="tab flex-1 justify-center text-[11.5px]"
                  onClick={() => setPanel(item.id)}
                >
                  <Icon className="mr-1 inline h-3 w-3" aria-hidden="true" /> {item.label}
                </button>
              )
            })}
          </div>

          {panel === 'chat' ? (
            <>
              <div className="thin-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
                {session.messages.length === 0 ? (
                  <p className="py-8 text-center text-[11px] text-soft">No messages yet.</p>
                ) : (
                  session.messages.map((message) => (
                    <div key={message.id} className={`flex flex-col ${message.authorId === user.id ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9.5px] text-soft">
                        {message.authorName} · {formatTime(message.at)}
                      </span>
                      <span
                        className={`mt-0.5 max-w-[92%] rounded-[10px] px-2.5 py-1.5 text-[11.5px] leading-snug ${
                          message.authorId === user.id ? 'bg-[var(--ink)] text-white' : 'bg-[var(--surface-sunken)] text-ink'
                        }`}
                      >
                        {message.text}
                      </span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form
                className="shrink-0 border-t border-[var(--line)] p-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!chatText.trim()) return
                  session.sendChat(chatText)
                  setChatText('')
                }}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    className="field-input"
                    placeholder="Message the class…"
                    aria-label="Chat message"
                    maxLength={400}
                  />
                  <button type="submit" className="btn btn-primary btn-sm shrink-0" aria-label="Send message">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : null}

          {panel === 'participants' ? (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
              <p className="label-xs mb-2">Connected</p>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--sky-50)] px-2.5 py-1.5">
                  <span className="truncate text-[11.5px] font-medium text-ink">{user.name} (you)</span>
                  <span className="shrink-0 text-[9.5px] text-soft">Host</span>
                </li>
                {session.participants
                  .filter((participant) => participant.role === 'student')
                  .map((participant) => (
                    <li key={participant.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <span className="truncate text-[11.5px] text-ink-80">
                        {participant.name}
                        {participant.handRaised ? <Hand className="ml-1 inline h-3 w-3 text-[#8a6d1f]" aria-hidden="true" /> : null}
                      </span>
                      <span className="shrink-0 text-[9.5px] text-soft">{participant.connection}</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-[10px] leading-snug text-soft">
                Presence is simulated by the demonstration classroom provider; no remote media is received.
              </p>
            </div>
          ) : null}

          {panel === 'polls' ? (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
              {!activePoll ? (
                <EmptyState compact icon={Radio} title="No poll yet" description="Launch a poll from the toolbar to check understanding live." />
              ) : (
                <div className="rounded-[10px] border border-[var(--line)] p-2.5">
                  <p className="text-[11.5px] font-medium text-ink">{activePoll.question}</p>
                  <div className="mt-2 space-y-1.5">
                    {activePoll.options.map((option, index) => {
                      const votes = activePoll.votes.filter((vote) => vote.optionIndex === index).length
                      const total = activePoll.votes.length || 1
                      return (
                        <div key={option}>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-ink-80">{option}</span>
                            <span className="tabular text-soft">{votes}</span>
                          </div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                            <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${(votes / total) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-soft">
                    {activePoll.votes.length} responses · {activePoll.ended ? 'closed' : 'open'}
                  </p>
                  {!activePoll.ended ? (
                    <Button size="xs" variant="secondary" className="mt-2" onClick={() => session.endPoll(activePoll.id)}>
                      Close poll
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <Drawer open={pollOpen} onClose={() => setPollOpen(false)} title="Launch a poll" description="Students answer from the classroom panel.">
        <form onSubmit={launchPoll} className="space-y-3">
          <label className="block">
            <span className="label-xs">Question</span>
            <input
              value={pollQuestion}
              onChange={(event) => setPollQuestion(event.target.value)}
              className="field-input mt-1"
              maxLength={160}
            />
          </label>
          <div>
            <span className="label-xs">Options</span>
            <div className="mt-1 space-y-1.5">
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(event) =>
                    setPollOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                  }
                  className="field-input"
                  aria-label={`Option ${index + 1}`}
                />
              ))}
            </div>
            {pollOptions.length < 6 ? (
              <button
                type="button"
                onClick={() => setPollOptions((current) => [...current, ''])}
                className="mt-1.5 text-[11px] font-medium text-link"
              >
                + Add option
              </button>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPollOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" icon={Radio}>
              Launch poll
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={rosterOpen} onClose={() => setRosterOpen(false)} title="Batch roster" description={klass.batch?.name}>
        <div className="space-y-2">
          {roster.loading ? (
            <LoadingBlock rows={3} />
          ) : roster.error ? (
            <ErrorState error={roster.error} onRetry={roster.refresh} compact />
          ) : (roster.data || []).length === 0 ? (
            <EmptyState compact icon={Users} title="No students enrolled" />
          ) : (
            (roster.data || []).map((student) => {
              const inRoom = session.participants.some((participant) => participant.id === student.id)
              const record = (klass.attendanceRecords || []).find((item) => item.studentId === student.id)
              return (
                <div key={student.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-medium text-ink">{student.name}</p>
                    <p className="text-[9.5px] text-soft">
                      {record?.joinEvents?.length ? `Joined ${relativeTime(record.joinEvents[0].at)}` : 'Not joined yet'}
                    </p>
                  </div>
                  <span className={`badge ${inRoom ? 'badge-good' : 'badge-outline'}`}>{inRoom ? 'In class' : 'Absent'}</span>
                </div>
              )
            })
          )}
          <Button size="sm" variant="secondary" className="mt-1 w-full" onClick={() => setRosterOpen(false)}>
            Close
          </Button>
        </div>
      </Drawer>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Studio settings" description="Local device only">
        <div className="space-y-4">
          <div>
            <p className="label-xs">Session</p>
            <dl className="mt-1 space-y-1 text-[12px]">
              <div className="flex justify-between"><dt className="text-muted">Session ID</dt><dd className="font-mono text-[11px] text-ink">{klass.sessionId}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Started</dt><dd className="text-ink">{klass.sessionStartedAt ? formatTime(klass.sessionStartedAt) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Elapsed</dt><dd className="text-ink tabular">{formatElapsed(elapsed)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Recording</dt><dd className="text-ink">{klass.recordingEnabled ? 'Enabled on end' : 'Disabled'}</dd></div>
            </dl>
          </div>
          <div>
            <p className="label-xs">Devices</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
              {media.devices.cameras.length
                ? media.devices.cameras.map((device) => <li key={device.deviceId}>Camera · {device.label || 'Default'}</li>)
                : <li>No camera detected</li>}
              {media.devices.microphones.length
                ? media.devices.microphones.map((device) => <li key={device.deviceId}>Microphone · {device.label || 'Default'}</li>)
                : <li>No microphone detected</li>}
            </ul>
          </div>
          <p className="rounded-[10px] bg-[var(--surface-sunken)] p-3 text-[10.5px] leading-relaxed text-muted">
            <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Camera, microphone and screen share use real browser APIs on this device only. Participants, chat and polls are
            simulated by the mock classroom provider — there is no real-time transport.
          </p>
          <Button size="sm" variant="secondary" onClick={() => media.testAudio().then((result) => toast.info('Microphone level', `${result.peak}% input detected.`))}>
            Test microphone
          </Button>
        </div>
      </Drawer>
    </div>
  )
}

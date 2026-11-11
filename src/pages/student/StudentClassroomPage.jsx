import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Hand,
  Mic,
  MicOff,
  MessageSquare,
  PhoneOff,
  Presentation,
  Send,
  Users,
  Video as VideoIcon,
  VideoOff,
  Wifi,
  WifiOff,
  Radio,
  Volume2,
  Info,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { liveClassService } from '../../services/live-class.service.js'
import { attendanceService } from '../../services/attendance.service.js'
import useLocalMedia from '../../lib/useLocalMedia.js'
import useClassroomSession from '../../layouts/classroom/useClassroomSession.js'
import { formatMinutes, formatTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { useConfirm, useToast } from '../../ui/feedback.jsx'
import { ErrorState, LoadingBlock, Drawer } from '../../ui/states.jsx'
import Button from '../../ui/Button.jsx'

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'polls', label: 'Polls', icon: Radio },
]

function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function StudentClassroomPage() {
  const { classId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const { data, error, loading, refresh } = useAsync(
    () => liveClassService.getStudentClassroomAccess(classId, user.id),
    [classId, user.id],
  )

  const media = useLocalMedia()
  const [joined, setJoined] = useState(false)
  const [tab, setTab] = useState('chat')
  const [chatText, setChatText] = useState('')
  const [handRaised, setHandRaised] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [left, setLeft] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [networkDropped, setNetworkDropped] = useState(false)
  const joinedAtRef = useRef(null)
  const chatEndRef = useRef(null)
  const reconnectedRef = useRef(false)

  const session = useClassroomSession({
    sessionId: data?.klass?.sessionId || classId,
    role: 'student',
    selfId: user.id,
    selfName: user.name,
    host: data?.sessionInfo?.faculty,
    batchId: data?.klass?.batchId,
  })

  const join = useCallback(async () => {
    setJoined(true)
    joinedAtRef.current = Date.now()
    await attendanceService.recordSessionEvent(classId, user.id, 'join').catch(() => {})
    session.emitLocal('participant-joined', {
      participant: {
        id: user.id,
        userId: user.id,
        name: user.name,
        role: 'student',
        joinedAt: new Date().toISOString(),
        micOn: false,
        cameraOn: false,
        handRaised: false,
        connection: 'good',
        self: true,
      },
    })
    toast.success('Joined the classroom', 'Your attendance has started for this session.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, user.id, user.name, toast])

  useEffect(() => {
    if (!joined) return
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - joinedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [joined])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session.messages.length, tab])

  const leave = useCallback(
    async (reason = 'leave') => {
      await attendanceService.recordSessionEvent(classId, user.id, 'leave').catch(() => {})
      media.stopAll()
      setLeft(true)
      toast.info(
        reason === 'ended' ? 'Session ended by faculty' : 'You left the classroom',
        reason === 'ended' ? 'Your attendance has been finalised.' : 'Your attended time has been recorded.',
      )
      navigate(`/student/live-classes/${classId}`)
    },
    [classId, user.id, media, navigate, toast],
  )

  const confirmLeave = async () => {
    const ok = await confirm({
      title: 'Leave the classroom?',
      description: 'Your attendance timer stops when you leave. You can rejoin while the session is still live.',
      confirmLabel: 'Leave class',
      tone: 'danger',
      details: [{ label: 'Time in class', value: formatElapsed(elapsed) }],
    })
    if (ok) leave('leave')
  }

  // Simulated network recovery demo: shows the recovery path without breaking state.
  useEffect(() => {
    if (!joined) return
    const timer = setTimeout(() => {
      setNetworkDropped(true)
      toast.info('Connection unstable', 'Simulated network drop — your session and attendance are preserved.')
      setTimeout(async () => {
        setNetworkDropped(false)
        if (!reconnectedRef.current) {
          reconnectedRef.current = true
          await liveClassService.logReconnection(classId, user.id).catch(() => {})
        }
      }, 4200)
    }, 24000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, classId, user.id])

  if (loading) {
    return (
      <div className="exam-viewport items-center justify-center">
        <LoadingBlock label="Preparing the classroom" rows={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[560px] p-6">
        <ErrorState error={error} onRetry={refresh} title="The classroom could not be opened" />
        <Button className="mt-3" variant="secondary" onClick={() => navigate('/student/live-classes')}>
          Back to live classes
        </Button>
      </div>
    )
  }

  const { klass, canJoin, reason, sessionInfo } = data

  if (!joined) {
    return (
      <div className="exam-viewport">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{klass.title}</p>
            <p className="text-[10.5px] text-soft">
              {sessionInfo.faculty?.name} · {subjectName(klass.subjectId)} · {sessionInfo.batch?.name}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/student/live-classes/${classId}`)}>
            Session details
          </Button>
        </header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="stage-dark stage-grid relative flex min-h-[240px] items-center justify-center overflow-hidden rounded-[16px]">
            <video ref={media.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Your camera preview" />
            {!media.cameraOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                <VideoOff className="h-7 w-7" aria-hidden="true" />
                <p className="text-[12px]">Camera preview is off</p>
                <p className="max-w-[280px] text-center text-[10.5px] text-white/45">
                  Your camera and microphone stay on this device. There is no broadcast to other participants in this
                  demonstration.
                </p>
              </div>
            ) : null}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[10px] text-white">
              <span className="dot bg-[#9adf8f]" /> You (local preview)
            </div>
          </div>

          <div className="space-y-3">
            <div className="surface p-4">
              <h1 className="text-[15px] font-medium text-ink">{canJoin ? 'Ready to join' : 'You cannot join yet'}</h1>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                {canJoin
                  ? 'Check your camera and microphone, then enter the classroom. Joining starts your attendance record for this session.'
                  : reason}
              </p>

              {media.error ? (
                <p className="mt-2 rounded-[8px] bg-[var(--cream-100)] px-2.5 py-2 text-[11px] leading-snug text-[#7a6220]">{media.error}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={media.cameraOn ? 'secondary' : 'sky'} icon={media.cameraOn ? VideoIcon : VideoOff} onClick={media.toggleCamera}>
                  {media.cameraOn ? 'Camera on' : 'Enable camera'}
                </Button>
                <Button size="sm" variant={media.micOn ? 'secondary' : 'sky'} icon={media.micOn ? Mic : MicOff} onClick={media.toggleMic}>
                  {media.micOn ? 'Microphone on' : 'Enable microphone'}
                </Button>
                <Button size="sm" variant="ghost" icon={Volume2} onClick={async () => {
                  const result = await media.testAudio()
                  toast.info('Microphone check', `Input level ${result.peak}% detected.`)
                }}>
                  Test audio
                </Button>
              </div>

              <Button
                className="mt-3"
                variant="primary"
                fullWidth
                size="lg"
                disabled={!canJoin}
                onClick={join}
              >
                {canJoin ? 'Join classroom' : 'Not available'}
              </Button>

              <p className="mt-2 text-[10px] leading-relaxed text-soft">
                Joining records a join event against session {klass.sessionId}. Attendance is duration-based and uses the
                eligible session window.
              </p>
            </div>

            <div className="surface-flat p-3.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                <Info className="h-3.5 w-3.5" aria-hidden="true" /> What this demonstration does
              </p>
              <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-muted">
                <li>• Real local camera, microphone and screen-share APIs.</li>
                <li>• Simulated participants, chat and polls in the shared session.</li>
                <li>• No media transmission: a live video provider is required for real teaching.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (left) return null

  const poll = session.polls[session.polls.length - 1]

  return (
    <div className="exam-viewport">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fbeeee] px-2 py-0.5 text-[10px] font-medium text-[#8c2f2f]">
            <span className="dot bg-[#9d3c3c]" /> LIVE
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{klass.title}</p>
            <p className="truncate text-[10px] leading-tight text-soft">
              {sessionInfo.faculty?.name} · {subjectName(klass.subjectId)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1 text-[10.5px] text-muted sm:inline-flex">
            {networkDropped ? <WifiOff className="h-3.5 w-3.5 text-[#8c2f2f]" /> : <Wifi className="h-3.5 w-3.5 text-[#375f34]" />}
            {networkDropped ? 'Reconnecting…' : 'Stable'}
          </span>
          <span className="tabular text-[11.5px] text-ink">{formatElapsed(elapsed)}</span>
          <Button size="xs" variant="secondary" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button size="xs" variant="danger" icon={PhoneOff} onClick={confirmLeave}>
            Leave
          </Button>
        </div>
      </header>

      {networkDropped ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-[#e3d5a8] bg-[var(--cream-100)] px-3 py-1.5 text-[11px] text-[#7a6220]">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> Connection interrupted. Reconnecting — your session and
          attendance are preserved.
        </div>
      ) : null}

      <div className="exam-body">
        <div className="flex min-h-0 flex-col">
          {/* main stage */}
          <div className="stage-dark stage-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div className="w-full max-w-[600px] px-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-[14px] border border-white/10 bg-black/40">
                <video ref={media.videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Local camera preview" />
                {!media.cameraOn ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/60">
                    <VideoOff className="h-6 w-6" aria-hidden="true" />
                    <p className="text-[11px]">Camera off</p>
                  </div>
                ) : null}
                <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">You</span>
                {media.screenSharing ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#aed9f0] px-2 py-0.5 text-[10px] font-medium text-[#245268]">
                    <Presentation className="h-3 w-3" /> Sharing your screen (local only)
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-white/5 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--sky-300)] text-[9px] font-semibold text-[#245268]">
                    {sessionInfo.faculty?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-white">{sessionInfo.faculty?.name}</p>
                    <p className="text-[9.5px] text-white/50">Faculty · presenting</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] text-white/70">
                  Demo stage — simulated presence
                </span>
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-[var(--line)] bg-white px-3 py-2">
            <button
              type="button"
              onClick={media.toggleMic}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                media.micOn ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
              aria-pressed={media.micOn}
              aria-label={media.micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {media.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={media.toggleCamera}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                media.cameraOn ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
              aria-pressed={media.cameraOn}
              aria-label={media.cameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {media.cameraOn ? <VideoIcon className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => (media.screenSharing ? media.stopScreenShare() : media.startScreenShare())}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] transition ${
                media.screenSharing ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
              aria-pressed={media.screenSharing}
            >
              <Presentation className="h-3.5 w-3.5" /> {media.screenSharing ? 'Stop share' : 'Share'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !handRaised
                setHandRaised(next)
                session.raiseHand(next)
                toast.info(next ? 'Hand raised' : 'Hand lowered', next ? 'Your faculty can see the request.' : undefined)
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] transition ${
                handRaised ? 'border-[#b08d31] bg-[var(--cream-100)] text-[#7a6220]' : 'border-[var(--line-strong)] bg-white text-ink'
              }`}
              aria-pressed={handRaised}
            >
              <Hand className="h-3.5 w-3.5" /> {handRaised ? 'Hand raised' : 'Raise hand'}
            </button>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-soft">
              <span>{session.participants.length + 1} in class</span>
              <span>·</span>
              <span>{formatMinutes(Math.round(elapsed / 60))} attended</span>
            </div>
          </div>
        </div>

        {/* side panel */}
        <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] bg-white lg:flex">
          <div className="tab-row shrink-0 px-2" role="tablist" aria-label="Classroom panels">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className="tab flex-1 justify-center text-[11.5px]"
                  onClick={() => setTab(item.id)}
                >
                  <Icon className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {tab === 'chat' ? (
            <>
              <div className="thin-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
                {session.messages.length === 0 ? (
                  <p className="py-8 text-center text-[11px] text-soft">No messages yet. Say hello to your class.</p>
                ) : (
                  session.messages.map((message) => (
                    <div key={message.id} className={`flex flex-col ${message.authorId === user.id ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9.5px] text-soft">
                        {message.authorName} · {formatTime(message.at)}
                      </span>
                      <span
                        className={`mt-0.5 max-w-[92%] rounded-[10px] px-2.5 py-1.5 text-[11.5px] leading-snug ${
                          message.authorId === user.id
                            ? 'bg-[var(--ink)] text-white'
                            : message.role === 'faculty'
                              ? 'bg-[var(--sky-100)] text-ink'
                              : 'bg-[var(--surface-sunken)] text-ink'
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
                    placeholder="Message the class…"
                    className="field-input"
                    aria-label="Chat message"
                    maxLength={400}
                  />
                  <button type="submit" className="btn btn-primary btn-sm shrink-0" aria-label="Send message" disabled={!chatText.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : null}

          {tab === 'participants' ? (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
              <p className="label-xs mb-2">In this session</p>
              <ul className="space-y-1.5">
                <li className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-1.5">
                  <span className="truncate text-[11.5px] font-medium text-ink">{sessionInfo.faculty?.name} (Faculty)</span>
                  <span className="shrink-0 text-[9.5px] text-soft">Host</span>
                </li>
                <li className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--sky-50)] px-2.5 py-1.5">
                  <span className="truncate text-[11.5px] text-ink">{user.name} (you)</span>
                  <span className="flex shrink-0 items-center gap-1 text-[9.5px] text-soft">{handRaised ? <Hand className="h-3 w-3" /> : null}Connected</span>
                </li>
                {session.participants
                  .filter((participant) => participant.id !== user.id && participant.role === 'student')
                  .map((participant) => (
                    <li key={participant.id} className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5">
                      <span className="truncate text-[11.5px] text-ink-80">{participant.name}</span>
                      <span className="shrink-0 text-[9.5px] text-soft">{participant.connection}</span>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 text-[10px] leading-snug text-soft">
                Participant presence is simulated by the mock classroom provider. No remote media is received.
              </p>
            </div>
          ) : null}

          {tab === 'polls' ? (
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
              {!poll ? (
                <p className="py-8 text-center text-[11px] text-soft">No active poll. Your faculty can start one during class.</p>
              ) : (
                <div className="rounded-[10px] border border-[var(--line)] p-2.5">
                  <p className="text-[11.5px] font-medium text-ink">{poll.question}</p>
                  <div className="mt-2 space-y-1.5">
                    {poll.options.map((option, index) => {
                      const votes = poll.votes.filter((vote) => vote.optionIndex === index).length
                      const total = poll.votes.length || 1
                      const mine = poll.votes.some((vote) => vote.userId === user.id && vote.optionIndex === index)
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => session.vote(poll.id, index)}
                          disabled={poll.ended}
                          className={`w-full rounded-[8px] border px-2.5 py-1.5 text-left text-[11px] transition ${
                            mine ? 'border-[var(--ink)] bg-[var(--sky-50)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-ink">{option}</span>
                            <span className="shrink-0 tabular text-soft">{Math.round((votes / total) * 100)}%</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-soft">
                    {poll.votes.length} responses {poll.ended ? '· poll closed' : '· poll open'}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      {/* mobile panel */}
      <div className="border-t border-[var(--line)] bg-white px-2 py-1.5 lg:hidden">
        <div className="flex items-center gap-1">
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full py-1.5 text-[11px] ${
                  tab === item.id ? 'bg-[var(--ink)] text-white' : 'text-ink-70'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            )
          })}
        </div>
        <div className="mt-1.5 max-h-[26vh] overflow-y-auto">
          {tab === 'chat' ? (
            <div className="space-y-1.5 px-1 pb-2">
              {session.messages.slice(-6).map((message) => (
                <p key={message.id} className="text-[11px] leading-snug text-ink-80">
                  <span className="font-medium text-ink">{message.authorName}:</span> {message.text}
                </p>
              ))}
              <form
                className="mt-1 flex gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!chatText.trim()) return
                  session.sendChat(chatText)
                  setChatText('')
                }}
              >
                <input
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  className="field-input"
                  placeholder="Message…"
                  aria-label="Chat message"
                />
                <button type="submit" className="btn btn-primary btn-sm" aria-label="Send">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : tab === 'participants' ? (
            <ul className="space-y-1 px-1 pb-2">
              <li className="text-[11px] text-ink">{sessionInfo.faculty?.name} (Faculty)</li>
              <li className="text-[11px] text-ink">{user.name} (you)</li>
              {session.participants
                .filter((participant) => participant.role === 'student' && participant.id !== user.id)
                .map((participant) => (
                  <li key={participant.id} className="text-[11px] text-ink-80">{participant.name}</li>
                ))}
            </ul>
          ) : (
            <div className="px-1 pb-2">
              {poll ? (
                <div>
                  <p className="text-[11px] font-medium text-ink">{poll.question}</p>
                  {poll.options.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => session.vote(poll.id, index)}
                      className="mt-1 w-full rounded-[6px] border border-[var(--line)] px-2 py-1 text-left text-[10.5px] text-ink"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-soft">No active poll.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Classroom settings" description="Local device only">
        <div className="space-y-4">
          <div>
            <p className="label-xs">Microphone</p>
            <p className="mt-1 text-[12px] text-ink">{media.micOn ? 'Live in this browser' : 'Muted'}</p>
            <Button size="sm" className="mt-2" variant="secondary" onClick={media.toggleMic}>
              {media.micOn ? 'Mute' : 'Unmute'}
            </Button>
          </div>
          <div>
            <p className="label-xs">Camera</p>
            <p className="mt-1 text-[12px] text-ink">{media.cameraOn ? 'Previewing locally' : 'Off'}</p>
            <Button size="sm" className="mt-2" variant="secondary" onClick={media.toggleCamera}>
              {media.cameraOn ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
          <div>
            <p className="label-xs">Detected devices</p>
            <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
              {media.devices.cameras.length ? media.devices.cameras.map((device) => <li key={device.deviceId}>Camera · {device.label || 'Default'}</li>) : <li>No camera detected</li>}
              {media.devices.microphones.length ? media.devices.microphones.map((device) => <li key={device.deviceId}>Microphone · {device.label || 'Default'}</li>) : <li>No microphone detected</li>}
            </ul>
          </div>
          <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
            <p className="text-[11px] font-medium text-ink">Network quality</p>
            <p className="mt-0.5 text-[11px] text-muted">{networkDropped ? 'Recovering — simulated interruption' : 'Stable (simulated)'}</p>
          </div>
          <p className="text-[10.5px] leading-relaxed text-soft">
            This classroom uses local device APIs only. Media is never sent to another device; a real-time provider is
            required for remote teaching.
          </p>
        </div>
      </Drawer>
    </div>
  )
}

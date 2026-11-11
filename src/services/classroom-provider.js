/* ------------------------------------------------------------------
   Classroom provider abstraction
   LiveClass UI → liveClassService → ClassroomProvider → MockClassroomProvider

   The mock provider simulates participants, chat and polls and it really does
   use the local camera / microphone / screen-share APIs where the browser
   permits. It does NOT broadcast media to remote participants — there is no
   signalling server in this frontend phase. Every screen that uses it says so.
------------------------------------------------------------------- */

export const ClassroomEventType = {
  PARTICIPANT_JOINED: 'participant-joined',
  PARTICIPANT_LEFT: 'participant-left',
  HAND_RAISED: 'hand-raised',
  HAND_LOWERED: 'hand-lowered',
  CHAT: 'chat',
  POLL_STARTED: 'poll-started',
  POLL_ENDED: 'poll-ended',
  SESSION_STARTED: 'session-started',
  SESSION_ENDED: 'session-ended',
  RECONNECTED: 'reconnected',
  MUTED: 'muted',
}

/**
 * Interface every provider must satisfy:
 *   connect(sessionId)                      → { ok }
 *   disconnect()                            → void
 *   subscribe(listener)                     → unsubscribe
 *   getParticipants()                       → Participant[]
 *   sendChat({ authorId, authorName, text }) → ChatMessage
 *   raiseHand(userId, raised)               → void
 *   startPoll(poll) / endPoll(pollId)       → Poll
 *   vote(pollId, userId, optionIndex)       → Poll
 *   capabilities()                          → { camera, microphone, screenShare, recording }
 */
export class MockClassroomProvider {
  constructor({ sessionId, role, selfId, selfName, batchId = null, studentIds = [] }) {
    this.sessionId = sessionId
    this.role = role
    this.selfId = selfId
    this.selfName = selfName
    this.batchId = batchId
    this.studentIds = studentIds
    this.listeners = new Set()
    this.timers = []
    this.participants = []
    this.messages = []
    this.polls = []
    this.sequence = 0
    this.connected = false
  }

  async connect() {
    this.connected = true
    this.participants =
      this.role === 'faculty'
        ? []
        : [
            {
              id: 'fac_host',
              userId: this.hostId || null,
              name: this.hostName || 'Faculty host',
              role: 'faculty',
              joinedAt: new Date().toISOString(),
              micOn: true,
              cameraOn: true,
              handRaised: false,
              connection: 'good',
            },
          ]
    this.emit({ type: ClassroomEventType.SESSION_STARTED, at: new Date().toISOString() })
    this.startSimulation()
    return { ok: true }
  }

  startSimulation() {
    if (this.role !== 'faculty') return
    // Simulated students trickle into the classroom so the studio panel is alive.
    const sample = this.studentIds.slice(0, 3)
    sample.forEach((student, index) => {
      const timer = setTimeout(() => {
        this.emit({
          type: ClassroomEventType.PARTICIPANT_JOINED,
          at: new Date().toISOString(),
          participant: {
            id: student.id,
            userId: student.id,
            name: student.name,
            role: 'student',
            joinedAt: new Date().toISOString(),
            micOn: false,
            cameraOn: false,
            handRaised: false,
            connection: index === 2 ? 'fair' : 'good',
            simulated: true,
          },
        })
      }, 2500 + index * 3800)
      this.timers.push(timer)
    })
  }

  disconnect() {
    this.connected = false
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers = []
    this.emit({ type: ClassroomEventType.SESSION_ENDED, at: new Date().toISOString() })
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event) {
    this.sequence += 1
    const payload = { ...event, seq: this.sequence }
    if (event.type === ClassroomEventType.CHAT && event.message) {
      this.messages = [...this.messages, event.message]
    }
    if (event.type === ClassroomEventType.PARTICIPANT_JOINED && event.participant) {
      this.participants = [...this.participants.filter((item) => item.id !== event.participant.id), event.participant]
    }
    if (event.type === ClassroomEventType.PARTICIPANT_LEFT) {
      this.participants = this.participants.filter((item) => item.id !== event.participantId)
    }
    if (event.type === ClassroomEventType.HAND_RAISED || event.type === ClassroomEventType.HAND_LOWERED) {
      this.participants = this.participants.map((item) =>
        item.id === event.participantId
          ? { ...item, handRaised: event.type === ClassroomEventType.HAND_RAISED }
          : item,
      )
    }
    if (event.type === ClassroomEventType.POLL_STARTED && event.poll) {
      this.polls = [...this.polls.filter((poll) => poll.id !== event.poll.id), event.poll]
    }
    if (event.type === 'poll-vote' && event.pollId) {
      this.polls = this.polls.map((poll) =>
        poll.id === event.pollId
          ? {
              ...poll,
              votes: [...poll.votes.filter((vote) => vote.userId !== event.userId), { userId: event.userId, optionIndex: event.optionIndex }],
            }
          : poll,
      )
    }
    if (event.type === ClassroomEventType.POLL_ENDED && event.pollId) {
      this.polls = this.polls.map((poll) => (poll.id === event.pollId ? { ...poll, ended: true } : poll))
    }
    this.listeners.forEach((listener) => listener(payload, this.snapshot()))
  }

  snapshot() {
    return {
      participants: this.participants,
      messages: this.messages,
      polls: this.polls,
      connected: this.connected,
    }
  }

  sendChat({ authorId, authorName, text, role = 'student' }) {
    const message = {
      id: `msg_${Date.now()}_${this.sequence}`,
      authorId,
      authorName,
      role,
      text: String(text).slice(0, 600),
      at: new Date().toISOString(),
    }
    this.emit({ type: ClassroomEventType.CHAT, message, at: message.at })
    return message
  }

  raiseHand(userId, raised) {
    this.emit({
      type: raised ? ClassroomEventType.HAND_RAISED : ClassroomEventType.HAND_LOWERED,
      participantId: userId,
      at: new Date().toISOString(),
    })
  }

  startPoll(poll) {
    const record = { ...poll, votes: [], ended: false, createdAt: new Date().toISOString() }
    this.emit({ type: ClassroomEventType.POLL_STARTED, poll: record, at: record.createdAt })
    return record
  }

  endPoll(pollId) {
    this.emit({ type: ClassroomEventType.POLL_ENDED, pollId, at: new Date().toISOString() })
  }

  vote(pollId, userId, optionIndex) {
    this.emit({ type: 'poll-vote', pollId, userId, optionIndex, at: new Date().toISOString() })
  }

  capabilities() {
    return {
      camera: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
      microphone: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
      screenShare: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia),
      recording: false,
      realtime: false,
      note: 'Local device preview only. Media is not transmitted to other participants in this demonstration.',
    }
  }
}

/* Factory so a real provider (LiveKit, Agora, Daily…) can be swapped in later
   without touching any component. */
export function createClassroomProvider(options) {
  return new MockClassroomProvider(options)
}

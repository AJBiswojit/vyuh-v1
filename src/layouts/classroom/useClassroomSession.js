import { useCallback, useEffect, useRef, useState } from 'react'
import { createClassroomProvider, ClassroomEventType } from '../../services/classroom-provider.js'

/**
 * Binds a classroom provider to React. The same hook powers the faculty studio
 * and the student classroom so both views read one session snapshot.
 */
export default function useClassroomSession({ sessionId, role, selfId, selfName, studentIds = [], batchId = null, host }) {
  const providerRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [polls, setPolls] = useState([])
  const [events, setEvents] = useState([])
  const [capabilities, setCapabilities] = useState(null)

  useEffect(() => {
    const provider = createClassroomProvider({ sessionId, role, selfId, selfName, studentIds, batchId })
    providerRef.current = provider
    provider.hostId = host?.id
    provider.hostName = host?.name
    setCapabilities(provider.capabilities())

    const unsubscribe = provider.subscribe((event, snapshot) => {
      setParticipants(snapshot.participants)
      setMessages(snapshot.messages)
      setPolls(snapshot.polls)
      setConnected(snapshot.connected)
      setEvents((current) => [event, ...current].slice(0, 60))
    })

    provider.connect().catch(() => {})

    return () => {
      unsubscribe()
      provider.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, role, selfId])

  const sendChat = useCallback(
    (text) => {
      if (!providerRef.current || !String(text).trim()) return null
      return providerRef.current.sendChat({ authorId: selfId, authorName: selfName, text, role })
    },
    [selfId, selfName, role],
  )

  const raiseHand = useCallback(
    (raised) => {
      providerRef.current?.raiseHand(selfId, raised)
    },
    [selfId],
  )

  const startPoll = useCallback((poll) => providerRef.current?.startPoll(poll), [])
  const endPoll = useCallback((pollId) => providerRef.current?.endPoll(pollId), [])
  const vote = useCallback(
    (pollId, optionIndex) => providerRef.current?.vote(pollId, selfId, optionIndex),
    [selfId],
  )

  const emitLocal = useCallback((type, payload = {}) => {
    providerRef.current?.emit({ type, at: new Date().toISOString(), ...payload })
  }, [])

  return {
    connected,
    participants,
    messages,
    polls,
    events,
    capabilities,
    sendChat,
    raiseHand,
    startPoll,
    endPoll,
    vote,
    emitLocal,
    ClassroomEventType,
  }
}

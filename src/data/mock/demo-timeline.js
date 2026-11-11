/* ------------------------------------------------------------------
   VYUH — demo timeline.
   The seed data was authored for a specific teaching week (11–13 Nov 2026).
   Real clocks move on, and a demo whose "live now" class is two days in the
   past reads as broken: the student cannot join, the faculty studio has nothing
   to run, and the timer on an "in progress" examination has already expired.

   This module keeps the authored story intact (same ordering, same relative
   gaps, same statuses) but rebases the seeded timestamps onto the current day
   the first time the demo store is created. Only records that are *relative to
   the demonstration* are shifted — deadline-style data (audit trail, notices,
   tickets, policy reviews) keep their original dates on purpose, because
   "this happened three weeks ago" is meaningful there.
------------------------------------------------------------------- */

const AUTHORED_DAY = '2026-11-11T00:00:00.000Z'

/** Whole-day offset (in ms) that puts the demo on today's calendar. */
export function demoOffset(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return today.getTime() - new Date(AUTHORED_DAY).getTime()
}

const shiftIso = (value, offset) => {
  if (typeof value !== 'string') return value
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return value
  return new Date(time + offset).toISOString()
}

const SHIFTED_KEYS = new Set([
  'startAt',
  'endAt',
  'scheduledStartAt',
  'scheduledEndAt',
  'sessionStartedAt',
  'sessionEndedAt',
  'deadlineAt',
  'startedAt',
  'submittedAt',
  'lastActivityAt',
  'publishedAt',
  'at',
  'recordedAt',
  'availableAt',
])

function shiftDeep(value, offset, key = null) {
  if (Array.isArray(value)) return value.map((item) => shiftDeep(item, offset, key))
  if (value && typeof value === 'object') {
    const next = {}
    for (const [childKey, child] of Object.entries(value)) {
      next[childKey] = shiftDeep(child, offset, childKey)
    }
    return next
  }
  if (key && SHIFTED_KEYS.has(key)) return shiftIso(value, offset)
  return value
}

/**
 * Rebases the demonstration-timeline collections onto today.
 * Returns the same store object, mutated, for convenience.
 */
/**
 * Anchors the authored "live" session to the current hour so that joining a
 * classroom works at any time of day, not only between 04:30 and 06:00 UTC
 * (which is what the seed literally says). Sessions that are still *scheduled*
 * are pulled forward too, so the upcoming list always contains something
 * genuinely ahead of the clock instead of classes that have already passed.
 */
function anchorLiveSessions(store, now) {
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const authoredStart = 4 * 60 + 30 // 04:30 UTC in the seed
  const delta = (minutes - 25 - authoredStart) * 60000 // live session starts 25 minutes ago

  const move = (value) => {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? value : new Date(time + delta).toISOString()
  }

  for (const klass of store.classes || []) {
    if (klass.status !== 'live') continue
    klass.scheduledStartAt = move(klass.scheduledStartAt)
    klass.scheduledEndAt = move(klass.scheduledEndAt)
    if (klass.sessionStartedAt) klass.sessionStartedAt = move(klass.sessionStartedAt)
    if (klass.sessionEndedAt) klass.sessionEndedAt = move(klass.sessionEndedAt)

    /* Join/leave events for this session are part of the same story: if the
       session moves and its register does not, a student who attended for the
       whole hour suddenly reads as absent, and the faculty register and the
       student view disagree. */
    for (const record of store.attendance || []) {
      if (record.classId !== klass.id) continue
      record.joinEvents = (record.joinEvents || []).map((event) => ({ ...event, at: move(event.at) }))
      record.leaveEvents = (record.leaveEvents || []).map((event) => ({ ...event, at: move(event.at) }))
      record.reconnectionEvents = (record.reconnectionEvents || []).map((event) => ({ ...event, at: move(event.at) }))
    }
  }

  const scheduled = (store.classes || [])
    .filter((klass) => klass.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt))

  scheduled.forEach((klass, index) => {
    /* First upcoming session in ~2h, then one per following day. */
    const target = new Date(now.getTime() + (index === 0 ? 2 : 24 * (index + 1)) * 3600000)
    const originalStart = new Date(klass.scheduledStartAt).getTime()
    const originalEnd = new Date(klass.scheduledEndAt).getTime()
    const length = originalEnd - originalStart
    target.setMinutes(originalStart % 3600000 === 1800000 ? 30 : 0, 0, 0)
    klass.scheduledStartAt = target.toISOString()
    klass.scheduledEndAt = new Date(target.getTime() + length).toISOString()
  })

  /* Attempts carry live countdowns; re-anchor anything still running. */
  for (const attempt of store.attempts || []) {
    if (attempt.status !== 'in-progress') continue
    attempt.startedAt = move(attempt.startedAt)
    attempt.deadlineAt = move(attempt.deadlineAt)
    attempt.lastActivityAt = move(attempt.lastActivityAt)
  }

  /* Examination windows that are meant to be open right now. */
  for (const exam of store.exams || []) {
    if (exam.status !== 'published') continue
    if (exam.id !== 'exam_neet_001') continue
    exam.startAt = new Date(now.getTime() - 45 * 60000).toISOString()
    exam.endAt = new Date(now.getTime() + 75 * 60000).toISOString()
  }

  return store
}

export function rebaseDemoTimeline(store, now = new Date()) {
  if (!store || store.demoRebasedAt) return store
  const offset = demoOffset(now)

  if (offset) {
    for (const collection of ['exams', 'classes', 'attempts', 'attendance', 'recordings', 'doubts']) {
      if (Array.isArray(store[collection])) {
        store[collection] = store[collection].map((record) => shiftDeep(record, offset))
      }
    }

    /* Integrity events refer to attempts that just moved. */
    if (Array.isArray(store.integrity)) {
      store.integrity = store.integrity.map((event) => ({ ...event, at: shiftIso(event.at, offset) }))
    }
  }

  anchorLiveSessions(store, now)

  store.demoRebasedAt = new Date(now).toISOString()
  return store
}

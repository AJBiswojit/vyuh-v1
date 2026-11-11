/* ------------------------------------------------------------------
   Duration-based attendance maths — pure functions.
   Rules enforced here:
   • joining/leaving is paired into intervals, no double counting
   • attendance can never exceed the eligible session duration
   • negative durations are impossible (intervals are clamped and sorted)
   • reconnect gaps are NOT counted as attended time
------------------------------------------------------------------- */

import { round } from '../services/api.js'
import { minutesBetween } from './time.js'

function toMs(value) {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

/**
 * Pairs join/leave events into non-overlapping intervals clipped to the
 * eligible session window. Overlaps are merged so reconnections cannot
 * duplicate attended time.
 */
export function computeIntervals(record, { sessionStart, sessionEnd, graceMinutes = 0, eligibleFrom, eligibleTo } = {}) {
  const joins = (record.joinEvents || [])
    .map((event) => toMs(event.at))
    .filter((value) => value !== null)
    .sort((a, b) => a - b)
  const leaves = (record.leaveEvents || [])
    .map((event) => toMs(event.at))
    .filter((value) => value !== null)
    .sort((a, b) => a - b)

  const windowStart = toMs(eligibleFrom ?? sessionStart)
  const windowEnd = toMs(eligibleTo ?? sessionEnd)
  if (windowStart === null || windowEnd === null || windowEnd <= windowStart) return []

  const grace = Math.max(0, Number(graceMinutes) || 0) * 60000
  const intervals = []
  let openJoin = null

  joins.forEach((join) => {
    if (openJoin === null) openJoin = join
    // If a second join arrives before a leave, keep the earliest join.
  })

  // Pair chronologically: walk through both lists in time order.
  const events = [
    ...joins.map((at) => ({ at, kind: 'join' })),
    ...leaves.map((at) => ({ at, kind: 'leave' })),
  ].sort((a, b) => a.at - b.at || (a.kind === 'join' ? -1 : 1))

  let currentJoin = null
  events.forEach((event) => {
    if (event.kind === 'join') {
      if (currentJoin === null) currentJoin = event.at
    } else if (currentJoin !== null) {
      intervals.push([currentJoin, event.at])
      currentJoin = null
    }
  })
  if (currentJoin !== null) intervals.push([currentJoin, windowEnd])

  const clipped = intervals
    .map(([start, end]) => [
      Math.max(start, windowStart + grace),
      Math.min(end, windowEnd),
    ])
    .filter(([start, end]) => end > start)

  // Merge overlaps so a reconnect never double-counts.
  const merged = []
  clipped
    .sort((a, b) => a[0] - b[0])
    .forEach(([start, end]) => {
      const last = merged[merged.length - 1]
      if (last && start <= last[1]) {
        last[1] = Math.max(last[1], end)
      } else {
        merged.push([start, end])
      }
    })

  return merged
}

export function computeAttendance(record, klass, policy) {
  const attendancePolicy = policy?.attendance ?? {}
  const graceMinutes = attendancePolicy.graceMinutes ?? 0
  const minimumEligibleMinutes = attendancePolicy.minimumEligibleMinutes ?? 10
  const threshold = klass?.attendanceThreshold ?? attendancePolicy.defaultThresholdPercent ?? 75

  const sessionStart = klass?.sessionStartedAt || klass?.scheduledStartAt
  const sessionEnd = klass?.sessionEndedAt || klass?.scheduledEndAt

  const scheduledDuration = Math.max(
    0,
    Math.round(minutesBetween(klass?.scheduledStartAt, klass?.scheduledEndAt)),
  )
  const eligibleDuration = Math.max(0, Math.round(minutesBetween(sessionStart, sessionEnd)))

  const intervals = computeIntervals(record, {
    sessionStart,
    sessionEnd,
    graceMinutes,
    eligibleFrom: sessionStart,
    eligibleTo: sessionEnd,
  })

  const rawMinutes = intervals.reduce((total, [start, end]) => total + (end - start) / 60000, 0)
  const cappedMinutes = Math.min(rawMinutes, eligibleDuration || rawMinutes)
  const attendedDuration = Math.max(0, round(cappedMinutes, 1))

  let attendancePercentage = 0
  if (eligibleDuration >= minimumEligibleMinutes) {
    attendancePercentage = round((attendedDuration / eligibleDuration) * 100, 1)
  } else if (eligibleDuration > 0) {
    // Sessions shorter than the policy minimum are not graded.
    attendancePercentage = record.joinEvents?.length ? 100 : 0
  }

  const status =
    attendedDuration <= 0
      ? 'absent'
      : attendancePercentage >= threshold
        ? 'present'
        : attendancePercentage >= (attendancePolicy.countPartialAbovePercent ?? 40)
          ? 'partial'
          : 'absent'

  return {
    attendanceId: record.id,
    classId: record.classId,
    sessionId: record.sessionId,
    studentId: record.studentId,
    scheduledDuration,
    eligibleDuration,
    joinEvents: record.joinEvents || [],
    leaveEvents: record.leaveEvents || [],
    reconnectionEvents: record.reconnectionEvents || [],
    intervals: intervals.map(([start, end]) => ({
      from: new Date(start).toISOString(),
      to: new Date(end).toISOString(),
      minutes: round((end - start) / 60000, 1),
    })),
    attendedDuration,
    attendancePercentage,
    status: record.status === 'excused' ? 'excused' : status,
    threshold,
    meetsThreshold: attendancePercentage >= threshold,
    correctionRequested: Boolean(record.correctionRequested),
    correctionReason: record.correctionReason ?? null,
  }
}

export function summariseAttendance(records, klassById) {
  if (!records.length) {
    return {
      sessions: 0,
      attendedMinutes: 0,
      eligibleMinutes: 0,
      attendancePercentage: 0,
      presentCount: 0,
      partialCount: 0,
      absentCount: 0,
    }
  }
  const attendedMinutes = records.reduce((total, record) => total + record.attendedDuration, 0)
  const eligibleMinutes = records.reduce((total, record) => total + record.eligibleDuration, 0)
  return {
    sessions: records.length,
    attendedMinutes: round(attendedMinutes, 1),
    eligibleMinutes: round(eligibleMinutes, 1),
    attendancePercentage: eligibleMinutes ? round((attendedMinutes / eligibleMinutes) * 100, 1) : 0,
    presentCount: records.filter((record) => record.status === 'present').length,
    partialCount: records.filter((record) => record.status === 'partial').length,
    absentCount: records.filter((record) => record.status === 'absent').length,
    classCount: new Set(records.map((record) => record.classId)).size,
    classById: klassById,
  }
}

export function attendanceTone(percentage, threshold = 75) {
  if (percentage >= threshold + 10) return 'good'
  if (percentage >= threshold) return 'ok'
  if (percentage > 0) return 'warning'
  return 'critical'
}

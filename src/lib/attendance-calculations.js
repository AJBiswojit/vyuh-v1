/* ------------------------------------------------------------------\n   Duration-based attendance maths — pure functions.\n   Rules enforced here:\n   • joining/leaving is paired into intervals, no double counting\n   • attendance can never exceed the eligible session duration\n   • negative durations are impossible (intervals are clamped and sorted)\n   • reconnect gaps are NOT counted as attended time\n   • a session is eligible only after its actual session end is recorded; an\n     in-progress class is never turned into a fabricated attendance percentage\n------------------------------------------------------------------- */

import { round } from '../services/api.js'
import { minutesBetween, instituteDayKey, formatDayKey, formatTime, monthLabel } from './time.js'

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
  /* Only the recorded end of an actual session creates an eligible window.
     Scheduled/live sessions have a planned end but no measured eligible time. */
  const sessionEnd = klass?.sessionEndedAt || null

  const scheduledDuration = Math.max(
    0,
    Math.round(minutesBetween(klass?.scheduledStartAt, klass?.scheduledEndAt)),
  )
  const eligibleDuration = sessionEnd
    ? Math.max(0, Math.round(minutesBetween(sessionStart, sessionEnd)))
    : 0

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

  let status
  if (!eligibleDuration) {
    status = record.joinEvents?.length ? 'in-progress' : 'not-eligible'
  } else if (attendedDuration <= 0) {
    status = 'absent'
  } else if (attendancePercentage >= threshold) {
    status = 'present'
  } else if (attendancePercentage >= (attendancePolicy.countPartialAbovePercent ?? 40)) {
    status = 'partial'
  } else {
    status = 'absent'
  }

  return {
    attendanceId: record.id,
    classId: record.classId,
    sessionId: record.sessionId,
    studentId: record.studentId,
    scheduledDuration,
    eligibleDuration,
    hasEligibleWindow: eligibleDuration > 0,
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
    meetsThreshold: eligibleDuration > 0 && attendancePercentage >= threshold,
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

function earliest(values) {
  return values.filter(Boolean).sort((a, b) => new Date(a) - new Date(b))[0] || null
}

function latest(values) {
  return values.filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || null
}

/** Adds first-in/last-out and timing signals from the existing raw events. */
export function decorateAttendanceTiming(record, klass, policy) {
  const graceMinutes = policy?.attendance?.graceMinutes ?? 0
  const sessionStart = klass?.sessionStartedAt || klass?.scheduledStartAt
  const sessionEnd = klass?.sessionEndedAt || null
  const firstIn = earliest((record.joinEvents || []).map((event) => event.at))
  const lastOut = latest((record.leaveEvents || []).map((event) => event.at))
  const isEligible = Boolean(record.eligibleDuration > 0 && sessionEnd)
  const lateArrivalMinutes =
    isEligible && firstIn && new Date(firstIn) > new Date(sessionStart)
      ? round(Math.max(0, minutesBetween(sessionStart, firstIn) - graceMinutes), 1)
      : 0
  const earlyDepartureMinutes =
    isEligible && lastOut && new Date(lastOut) < new Date(sessionEnd)
      ? round(Math.max(0, minutesBetween(lastOut, sessionEnd) - graceMinutes), 1)
      : 0
  const dateKey = instituteDayKey(klass?.scheduledStartAt || sessionStart || firstIn || Date.now())
  const checkoutNote = !firstIn
    ? 'No check-in event recorded'
    : !lastOut
      ? ['live', 'starting'].includes(klass?.status)
        ? 'Session in progress — no checkout event yet'
        : 'No checkout event recorded'
      : null

  return {
    ...record,
    dateKey,
    dateLabel: formatDayKey(dateKey),
    firstIn,
    lastOut,
    firstInLabel: firstIn ? formatTime(firstIn) : '—',
    lastOutLabel: lastOut ? formatTime(lastOut) : '—',
    checkoutNote,
    lateArrivalMinutes,
    earlyDepartureMinutes,
    lateArrival: lateArrivalMinutes >= 1,
    earlyDeparture: earlyDepartureMinutes >= 1,
    reconnectionCount: Math.max(
      (record.reconnectionEvents || []).length,
      Math.max(0, (record.joinEvents || []).length - 1),
    ),
    isEligible,
    isPending: !isEligible && ['live', 'starting', 'scheduled'].includes(klass?.status),
    sessionStartedAt: sessionStart,
    sessionEndedAt: sessionEnd,
    scheduledEndAt: klass?.scheduledEndAt,
    classStatus: klass?.status,
  }
}

function sumMinutes(records, key) {
  return round(records.reduce((total, record) => total + (Number(record[key]) || 0), 0), 1)
}

function summariseDay(key, sessions, threshold) {
  const eligibleMinutes = sumMinutes(sessions, 'eligibleDuration')
  const attendedMinutes = Math.min(sumMinutes(sessions, 'attendedDuration'), eligibleMinutes)
  const missedMinutes = round(Math.max(0, eligibleMinutes - attendedMinutes), 1)
  const presentClasses = sessions.filter((session) => session.status === 'present').length
  const partialClasses = sessions.filter((session) => session.status === 'partial').length
  const absentClasses = sessions.filter((session) => session.status === 'absent').length
  const attendedClasses = sessions.filter((session) => session.attendedDuration > 0).length
  const firstIn = earliest(sessions.map((session) => session.firstIn))
  const lastOut = latest(sessions.map((session) => session.lastOut))
  const percentage = eligibleMinutes ? round((attendedMinutes / eligibleMinutes) * 100, 1) : null
  return {
    key,
    label: formatDayKey(key),
    hasEligibleClass: eligibleMinutes > 0 && sessions.length > 0,
    classCount: sessions.length,
    attendedClasses,
    missedClasses: absentClasses,
    partialClasses,
    presentClasses,
    attendedMinutes,
    eligibleMinutes,
    missedMinutes,
    percentage,
    attendedPercentage: percentage,
    missedPercentage: percentage === null ? null : round(100 - percentage, 1),
    firstIn,
    lastOut,
    firstInLabel: firstIn ? formatTime(firstIn) : '—',
    lastOutLabel: lastOut ? formatTime(lastOut) : '—',
    checkoutNote: firstIn && !lastOut ? 'No checkout event recorded' : null,
    meetsThreshold: percentage !== null && percentage >= threshold,
    lateArrivals: sessions.filter((session) => session.lateArrival).length,
    earlyDepartures: sessions.filter((session) => session.earlyDeparture).length,
    thresholdWarnings: sessions.filter((session) => !session.meetsThreshold).length,
    sessions: [...sessions].sort((a, b) => new Date(a.scheduledStartAt || a.sessionStartedAt) - new Date(b.scheduledStartAt || b.sessionStartedAt)),
  }
}

/** Builds date, month and warning views from decorated attendance records. */
export function buildAttendanceDayView(records, { policy, now = new Date() } = {}) {
  const threshold = policy?.attendance?.defaultThresholdPercent ?? 75
  const eligibleRecords = records.filter((record) => record.isEligible)
  const nonEligibleRecords = records.filter((record) => !record.isEligible)

  const dayMap = new Map()
  eligibleRecords.forEach((record) => {
    const bucket = dayMap.get(record.dateKey) || []
    bucket.push(record)
    dayMap.set(record.dateKey, bucket)
  })
  const days = [...dayMap.entries()]
    .map(([key, sessions]) => summariseDay(key, sessions, threshold))
    .sort((a, b) => a.key.localeCompare(b.key))

  const monthMap = new Map()
  eligibleRecords.forEach((record) => {
    const key = String(record.dateKey).slice(0, 7)
    const bucket = monthMap.get(key) || {
      key,
      label: monthLabel(key),
      sessions: 0,
      attended: 0,
      eligible: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      thresholdWarnings: 0,
    }
    bucket.sessions += 1
    bucket.attended += Number(record.attendedDuration) || 0
    bucket.eligible += Number(record.eligibleDuration) || 0
    bucket.lateArrivals += record.lateArrival ? 1 : 0
    bucket.earlyDepartures += record.earlyDeparture ? 1 : 0
    bucket.thresholdWarnings += record.meetsThreshold ? 0 : 1
    monthMap.set(key, bucket)
  })
  const monthly = [...monthMap.values()]
    .map((bucket) => ({
      ...bucket,
      attended: round(bucket.attended, 1),
      eligible: round(bucket.eligible, 1),
      percentage: bucket.eligible ? round((bucket.attended / bucket.eligible) * 100, 1) : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))

  const nonEligibleByDate = {}
  nonEligibleRecords.forEach((record) => {
    if (!nonEligibleByDate[record.dateKey]) nonEligibleByDate[record.dateKey] = []
    nonEligibleByDate[record.dateKey].push(record)
  })

  const timingWarnings = eligibleRecords
    .filter((record) => record.lateArrival || record.earlyDeparture || !record.meetsThreshold)
    .map((record) => ({
      attendanceId: record.attendanceId,
      classId: record.classId,
      title: record.classTitle,
      dateKey: record.dateKey,
      dateLabel: record.dateLabel,
      lateArrivalMinutes: record.lateArrivalMinutes,
      earlyDepartureMinutes: record.earlyDepartureMinutes,
      percentage: record.attendancePercentage,
      threshold: record.threshold,
      reasons: [
        record.lateArrival ? `Late arrival ${record.lateArrivalMinutes} min after grace` : null,
        record.earlyDeparture ? `Early departure ${record.earlyDepartureMinutes} min before session end` : null,
        !record.meetsThreshold ? `Below ${record.threshold}% threshold (${record.attendancePercentage}%)` : null,
      ].filter(Boolean),
    }))

  return {
    days,
    dayByKey: Object.fromEntries(days.map((day) => [day.key, day])),
    monthly,
    timingWarnings,
    nonEligibleByDate,
    latestDateKey: days.length ? days[days.length - 1].key : instituteDayKey(now),
    threshold,
    eligibleSessionCount: eligibleRecords.length,
    pendingSessionCount: nonEligibleRecords.length,
  }
}

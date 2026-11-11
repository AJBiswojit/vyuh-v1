/* Date/time formatting used across all three workspaces. Institute timezone is
   Asia/Kolkata (IST) and the display preference is read from policies. */

export const INSTITUTE_TIMEZONE = 'Asia/Kolkata'

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INSTITUTE_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INSTITUTE_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INSTITUTE_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const weekdayFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INSTITUTE_TIMEZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function formatDateTime(value) {
  if (!value) return '—'
  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value) {
  if (!value) return '—'
  return dateFormatter.format(new Date(value))
}

export function formatTime(value) {
  if (!value) return '—'
  return timeFormatter.format(new Date(value))
}

export function formatWeekday(value) {
  if (!value) return '—'
  return weekdayFormatter.format(new Date(value))
}

export function formatRange(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  return `${formatDate(startIso)} · ${formatTime(startIso)} – ${formatTime(endIso)}`
}

export function formatDayLabel(value) {
  const date = new Date(value)
  const today = new Date()
  const startOfDay = (input) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime()
  const diffDays = Math.round((startOfDay(date) - startOfDay(today)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return formatWeekday(value)
}

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(secs).padStart(2, '0')}s`
  return `${secs}s`
}

export function formatMinutes(minutes) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0))
  if (safe < 60) return `${safe} min`
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`
}

export function relativeTime(value) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const future = diff < 0
  const abs = Math.abs(diff)
  const units = [
    { limit: 60000, size: 1000, label: 'second' },
    { limit: 3600000, size: 60000, label: 'minute' },
    { limit: 86400000, size: 3600000, label: 'hour' },
    { limit: 604800000, size: 86400000, label: 'day' },
    { limit: 2629800000, size: 604800000, label: 'week' },
    { limit: Infinity, size: 2629800000, label: 'month' },
  ]
  const unit = units.find((entry) => abs < entry.limit)
  const amount = Math.max(1, Math.round(abs / unit.size))
  return `${amount} ${unit.label}${amount > 1 ? 's' : ''} ${future ? 'from now' : 'ago'}`
}

export function minutesBetween(startIso, endIso) {
  if (!startIso || !endIso) return 0
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
}

export function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString()
}

export function isSameDay(left, right) {
  const a = new Date(left)
  const b = new Date(right)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function startOfDayIso(iso) {
  const date = new Date(iso)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
}

export function monthKey(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function toDateTimeLocalValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

export function greetingForNow() {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', { timeZone: INSTITUTE_TIMEZONE, hour: '2-digit', hour12: false }).format(new Date()),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

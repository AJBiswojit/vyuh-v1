/* Core helpers shared by every service: simulated latency, consistent errors,
   id generation and small query utilities. UI code never talks to the mock
   store directly — only through services. */

export class ApiError extends Error {
  constructor(message, { code = 'service-error', status = 400, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const USE_MOCK_ERRORS = import.meta.env.VITE_MOCK_ERRORS === 'true'
const ERROR_RATE = Number(import.meta.env.VITE_MOCK_ERROR_RATE || 0.03)

export const MOCK_LATENCY = {
  fast: 120,
  normal: 260,
  slow: 480,
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Simulates a provider request. Resolves with the value produced by `producer`
 * (which may be async). Rejects with an ApiError on validation problems or —
 * when VITE_MOCK_ERRORS is enabled — with a random transport failure so error
 * states are reachable in the demo.
 */
export async function request(producer, { latency = MOCK_LATENCY.normal, label = 'request', errorRate } = {}) {
  await delay(latency)
  const rate = errorRate ?? (USE_MOCK_ERRORS ? ERROR_RATE : 0)
  if (rate > 0 && Math.random() < rate) {
    throw new ApiError(`The ${label} service did not respond. Please try again.`, {
      code: 'transport',
      status: 503,
    })
  }
  return producer()
}

export function assert(condition, message, options) {
  if (!condition) throw new ApiError(message, options)
}

export function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload?.[field]
    return value === undefined || value === null || value === ''
  })
  if (missing.length) {
    throw new ApiError('Some required fields are missing.', {
      code: 'validation',
      details: { fields: missing },
    })
  }
}

let counter = 0
export function createId(prefix) {
  counter += 1
  const stamp = Date.now().toString(36).slice(-5)
  return `${prefix}_${stamp}${counter.toString(36)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function sortBy(items, selector, direction = 'desc') {
  return [...items].sort((a, b) => {
    const left = selector(a)
    const right = selector(b)
    if (left === right) return 0
    const order = left > right ? 1 : -1
    return direction === 'asc' ? order : -order
  })
}

export function paginate(items, page = 1, pageSize = 10) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    meta: { page: safePage, pageSize, total, totalPages },
  }
}

export function percent(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 1000) / 10
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function debounce(fn, wait = 250) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/* ------------------------------------------------------------------
   VYUH — centralized mock persistence
   The ONLY module that touches localStorage. Services and repositories
   read/write through this adapter; React components never do.

   This is a frontend demonstration store. It is not secure: any user can
   read or edit it from devtools. See docs/VYUH_BACKEND_INTEGRATION_NOTES.md.
------------------------------------------------------------------- */

import { buildSeed } from './seed.js'

export const STORAGE_KEY = 'vyuh:mock:v1'
export const SCHEMA_VERSION = 3

export function emptyStore() {
  return {
    version: SCHEMA_VERSION,
    seededAt: null,
    institute: null,
    users: [],
    students: [],
    faculty: [],
    batches: [],
    subjects: [],
    questions: [],
    exams: [],
    attempts: [],
    classes: [],
    attendance: [],
    recordings: [],
    doubts: [],
    notifications: [],
    policies: null,
    approvals: [],
    integrity: [],
    supportTickets: [],
    audit: [],
    aiConversations: [],
    settings: {},
  }
}

// Collections that live inside the single store object.
export const COLLECTIONS = [
  'users',
  'students',
  'faculty',
  'batches',
  'subjects',
  'questions',
  'exams',
  'attempts',
  'classes',
  'attendance',
  'recordings',
  'doubts',
  'notifications',
  'approvals',
  'integrity',
  'supportTickets',
  'audit',
  'aiConversations',
]

let memoryCache = null
const listeners = new Set()

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function loadStore({ force = false } = {}) {
  if (memoryCache && !force) return memoryCache

  if (!hasLocalStorage()) {
    memoryCache = buildSeed()
    memoryCache.seededAt = new Date().toISOString()
    return memoryCache
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === SCHEMA_VERSION) {
        memoryCache = parsed
        return memoryCache
      }
      // Version mismatch: the demo schema evolved, reseed rather than crash.
      console.info('[vyuh] mock schema changed — reseeding demo data')
    }
  } catch (error) {
    console.warn('[vyuh] could not read mock store, reseeding', error)
  }

  const seeded = buildSeed()
  seeded.seededAt = new Date().toISOString()
  memoryCache = seeded
  persist()
  return memoryCache
}

function persist() {
  if (!memoryCache) return
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache))
  } catch (error) {
    console.warn('[vyuh] mock persistence failed', error)
  }
}

export function saveStore() {
  if (memoryCache) memoryCache.version = SCHEMA_VERSION
  persist()
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/* ---------------------------- read helpers ---------------------------- */

export function readAll(collection) {
  const store = loadStore()
  return Array.isArray(store[collection]) ? store[collection] : []
}

export function readOne(collection, id) {
  return readAll(collection).find((record) => record.id === id) || null
}

export function readSingleton(key) {
  return loadStore()[key] ?? null
}

/* ---------------------------- write helpers --------------------------- */

export function writeAll(collection, records) {
  const store = loadStore()
  store[collection] = records
  saveStore()
  return records
}

export function insert(collection, record) {
  const store = loadStore()
  store[collection] = [...(store[collection] || []), record]
  saveStore()
  return record
}

export function updateRecord(collection, id, patchOrUpdater) {
  const store = loadStore()
  let updated = null
  store[collection] = (store[collection] || []).map((record) => {
    if (record.id !== id) return record
    const patch = typeof patchOrUpdater === 'function' ? patchOrUpdater(record) : patchOrUpdater
    updated = { ...record, ...patch }
    return updated
  })
  saveStore()
  return updated
}

export function removeRecord(collection, id) {
  const store = loadStore()
  const exists = (store[collection] || []).some((record) => record.id === id)
  store[collection] = (store[collection] || []).filter((record) => record.id !== id)
  saveStore()
  return exists
}

export function writeSingleton(key, value) {
  const store = loadStore()
  store[key] = value
  saveStore()
  return value
}

/* ------------------------------- reset -------------------------------- */

export function resetStore() {
  memoryCache = buildSeed()
  memoryCache.seededAt = new Date().toISOString()
  persist()
  listeners.forEach((listener) => listener())
  return memoryCache
}

export function storeMeta() {
  const store = loadStore()
  return { version: store.version, seededAt: store.seededAt }
}

/* ------------------------- demo password hash ------------------------- */
/* Deliberately simple, client-side only. Documented as NOT secure: a real
   deployment must authenticate server-side (see backend notes). */

export function hashPassword(plain) {
  const salted = `vyuh-demo::${plain}`
  let hash = 5381
  for (let index = 0; index < salted.length; index += 1) {
    hash = ((hash << 5) + hash + salted.charCodeAt(index)) | 0
  }
  return `d1$${(hash >>> 0).toString(36)}`
}

export function verifyPassword(plain, storedHash) {
  return hashPassword(plain) === storedHash
}

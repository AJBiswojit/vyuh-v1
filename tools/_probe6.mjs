import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const store = (await server.ssrLoadModule('/src/data/mock/mock-storage.js')).loadStore()
const now = Date.now()
const fmt = (t) => new Date(t).toISOString().slice(0,16)
console.log('NOW', new Date().toISOString())
console.log('\nCLASSES:')
for (const c of store.classes) console.log(' ', c.id.padEnd(10), c.status.padEnd(12), fmt(c.scheduledStartAt), '→', fmt(c.scheduledEndAt), c.sessionStartedAt ? `started ${fmt(c.sessionStartedAt)}` : '')
console.log('\nEXAMS:')
for (const e of store.exams) {
  const state = now < new Date(e.startAt) ? 'upcoming' : now > new Date(e.endAt) ? 'closed' : 'OPEN'
  console.log(' ', e.id.padEnd(18), e.status.padEnd(12), state.padEnd(9), fmt(e.startAt), '→', fmt(e.endAt))
}
console.log('\nRECORDINGS:', store.recordings.length, 'DOUBTS:', store.doubts.filter(d=>d.status!=='resolved').length, 'unresolved')
console.log('stale-format date strings?', JSON.stringify(store).match(/"[0-9]{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d\d/g)?.slice(0,5) || 'none')
await server.close(); process.exit(0)

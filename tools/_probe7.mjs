import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const tl = await server.ssrLoadModule('/src/data/mock/demo-timeline.js')
console.log('offset hours:', tl.demoOffset(new Date()) / 3600000)
const now = new Date()
const store = { exams: [{ id: 'exam_neet_001', status: 'published', startAt: '2026-11-11T03:15:00.000Z', endAt: '2026-11-11T05:30:00.000Z' }], classes: [{ id: 'class_001', status: 'live', scheduledStartAt: '2026-11-11T04:30:00.000Z', scheduledEndAt: '2026-11-11T06:00:00.000Z', sessionStartedAt: '2026-11-11T04:31:00.000Z' }], attempts: [] }
tl.rebaseDemoTimeline(store, now)
console.log(JSON.stringify(store, null, 1))
await server.close(); process.exit(0)

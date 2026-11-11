import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { examService } = await server.ssrLoadModule('/src/services/exam.service.js')
const store = await server.ssrLoadModule('/src/data/mock/mock-storage.js')
const s = store.loadStore()
const b2 = s.users.filter(u => u.role === 'student' && u.batchIds?.includes('batch_002')).map(u => u.id)
console.log('batch_002 students:', b2.join(','))
for (const id of b2) {
  const r = await examService.getExamForStudent('exam_neet_001', id)
  console.log(id, 'canStart=', r.canStart, 'attempt=', r.attempt?.status || 'none', '|', r.blockedReason || '')
}
await server.close(); process.exit(0)

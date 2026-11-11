import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { examService } = await server.ssrLoadModule('/src/services/exam.service.js')
const exams = await examService.getStudentExams('stu_001')
console.log('now:', new Date().toISOString())
for (const bucket of ['upcoming','inProgress','completed','missed','cancelled']) {
  for (const e of exams[bucket] || []) console.log(bucket.padEnd(11), e.id.padEnd(18), e.windowState.padEnd(14), e.startAt, '→', e.endAt)
}
await server.close(); process.exit(0)

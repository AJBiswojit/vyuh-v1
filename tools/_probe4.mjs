import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { examService } = await server.ssrLoadModule('/src/services/exam.service.js')
const { attemptService } = await server.ssrLoadModule('/src/services/attempt.service.js')
const exams = await examService.getStudentExams('stu_006')
for (const b of ['upcoming','inProgress','completed']) for (const e of exams[b]||[]) console.log(b, e.id, e.windowState, e.title)
const student = await examService.getExamForStudent('exam_neet_001','stu_006')
console.log('canStart:', student.canStart, '| blocked:', student.blockedReason, '| attempt:', JSON.stringify(student.attempt))
const started = await attemptService.startExam('exam_neet_001','stu_006')
console.log('attempt id:', started.attempt?.id, 'resumed:', started.resumed)
await server.close(); process.exit(0)

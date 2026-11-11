import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const { examService } = await load('/src/services/exam.service.js')
const { authService } = await load('/src/services/auth.service.js')
const store = (await load('/src/data/mock/mock-storage.js'))
store.resetStore()
await authService.login({ email: 'aarav.mishra@vyuhacademy.edu.in', password: authService.demoPassword() })
const pool = await examService.getQuestionPool({ subjectId: 'sub_phy' })
const exam = await examService.createExam({
  title: 'Probe Paper', description: 'x', type: 'Unit Test', subjectId: 'sub_phy', batchIds: ['batch_001'],
  startAt: new Date(Date.now() - 300000).toISOString(), endAt: new Date(Date.now() + 7200000).toISOString(),
  durationMinutes: 45, sections: [{ name: 'A', subjectId: 'sub_phy', questionIds: pool.slice(0,3).map(q=>q.id) }], status: 'draft',
}, { id: 'fac_001', role: 'faculty' })
await examService.publishExam(exam.id, { id: 'fac_001', role: 'faculty' })
await authService.logout()
await authService.login({ email: 'ananya.sharma@student.vyuhacademy.edu.in', password: authService.demoPassword() })
const exams = await examService.getStudentExams('stu_001')
console.log('buckets:', Object.fromEntries(Object.entries(exams).map(([k,v])=>[k, v.length])))
const all = Object.entries(exams).flatMap(([k, v]) => v.map((e) => `${k}:${e.id}:${e.windowState}`))
console.log(all.join('\n'))
const s = store.loadStore()
const target = s.exams.find(e => e.id === exam.id)
console.log('created exam:', JSON.stringify({ status: target.status, startAt: target.startAt, endAt: target.endAt, batchIds: target.batchIds }))
const probe = s.students.find(x => x.id === 'stu_001')
console.log('student batch:', JSON.stringify(probe))
await server.close(); process.exit(0)

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const { liveClassService } = await load('/src/services/live-class.service.js')
const { attendanceService } = await load('/src/services/attendance.service.js')
const store = (await load('/src/data/mock/mock-storage.js')).loadStore()
console.log('class_001:', JSON.stringify(store.classes[0]))
const att = store.attendance.find(r => r.classId === 'class_001')
console.log('\nclass_001 attendance record:', JSON.stringify(att))
const reg = await attendanceService.getClassAttendance('class_001')
console.log('\nregister for class_001 records:', reg.records.length)
console.log(JSON.stringify(reg.records.find(r => r.studentId === 'stu_001')))
await server.close(); process.exit(0)

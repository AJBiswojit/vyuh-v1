import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.localStorage = dom.window.localStorage
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const { liveClassService } = await load('/src/services/live-class.service.js')
const { attendanceService } = await load('/src/services/attendance.service.js')
const ov = await liveClassService.getFacultyClassOverview('fac_001')
const all = [...(ov.live||[]), ...(ov.recent||[])]
console.log('sessions:', all.map(c => `${c.id}:${c.status}:records=${(c.attendanceRecords||[]).length}`).join(' | '))
const withStu = all.find(c => (c.attendanceRecords||[]).some(r => r.studentId === 'stu_001'))
console.log('with stu_001:', withStu?.id)
if (withStu) {
  const reg = await attendanceService.getClassAttendance(withStu.id)
  console.log('register records:', reg.records?.length, 'keys:', Object.keys(reg))
  const row = reg.records?.find(r => r.studentId === 'stu_001')
  console.log('row:', JSON.stringify(row))
}
const sa = await attendanceService.getStudentAttendance('stu_001')
console.log('student sessions:', sa.sessions.map(s => `${s.classId}:${s.percentage}`).join(' '))
await server.close(); process.exit(0)

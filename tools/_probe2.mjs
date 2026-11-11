import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window; globalThis.document = window.document
for (const k of ['HTMLElement','Element','Node','Event','CustomEvent','MouseEvent','KeyboardEvent','InputEvent','localStorage','sessionStorage']) globalThis[k] = window[k]
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noop = class { observe(){} unobserve(){} disconnect(){} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const mockStorage = await load('/src/data/mock/mock-storage.js')
const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clean = () => (rootEl.textContent || '').replace(/\s+/g, ' ')
async function mount(path, settle=2400) {
  rootEl.innerHTML = ''
  const root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
  return root
}
const clickText = (sel, text) => {
  const el = [...rootEl.querySelectorAll(sel)].find((n) => (n.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes(text.toLowerCase()))
  if (!el) return false
  el.dispatchEvent(new window.MouseEvent('click', { bubbles:true, cancelable:true, view: window }))
  return true
}
window.localStorage.clear(); mockStorage.resetStore?.()
await authService.login({ email: 'ananya.sharma@student.vyuhacademy.edu.in', password: authService.demoPassword() })
let root = await mount('/student/exams/exam_full_001/instructions')
const cb = rootEl.querySelector('main input[type="checkbox"]')
console.log('checkbox present:', Boolean(cb), 'checked:', cb?.checked)
if (cb && !cb.checked) { cb.dispatchEvent(new window.MouseEvent('click', { bubbles:true, cancelable:true, view: window })); await sleep(300) }
console.log('start clicked:', clickText('main button', 'start examination'))
await sleep(3000)
console.log('--- LIVE PAGE (main) ---')
console.log(clean().slice(0, 2000))
console.log('--- BUTTONS ---')
console.log([...rootEl.querySelectorAll('main button')].map((b)=>`[${(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,20)}|${b.disabled?'disabled':'enabled'}]`).join(' '))
console.log('submit clicked:', clickText('main button', 'submit'))
await sleep(1200)
console.log('--- DIALOG? ---')
console.log([...rootEl.querySelectorAll('[role="dialog"], .dialog, [aria-modal="true"]')].map((d)=>d.textContent.replace(/\s+/g,' ').slice(0,120)))
console.log('--- ALL BUTTONS AFTER SUBMIT CLICK ---')
console.log([...rootEl.querySelectorAll('button')].map((b)=>`[${(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,22)}]`).join(' '))
console.log('confirm clicked:', clickText('button', 'submit now'))
await sleep(3000)
console.log('--- AFTER CONFIRM ---')
console.log(clean().slice(0, 200))
root.unmount(); await server.close(); process.exit(0)

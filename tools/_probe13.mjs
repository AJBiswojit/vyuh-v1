import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window; globalThis.document = window.document
for (const k of ['HTMLElement','Element','Node','Event','CustomEvent','MouseEvent','localStorage','sessionStorage']) globalThis[k] = window[k]
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
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
console.error=()=>{}; console.warn=()=>{}
const server = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'error',
  define:{ 'import.meta.env.VITE_MOCK_ERRORS':'"true"', 'import.meta.env.VITE_MOCK_ERROR_RATE':'0.85' } })
const load = (p)=>server.ssrLoadModule(p)
const React=(await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App=(await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const rootEl=window.document.getElementById('root')
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
window.localStorage.clear()
for(let i=0;i<12;i++){try{await authService.login({email:process.env.EMAIL||'ananya.sharma@student.vyuhacademy.edu.in',password:authService.demoPassword()});break}catch{await sleep(20)}}
rootEl.innerHTML=''; const root=createRoot(rootEl)
root.render(React.createElement(MemoryRouter,{initialEntries:[process.argv[2]||'/student/exams']},React.createElement(App)))
await sleep(2500)
console.log((rootEl.querySelector('main')?.textContent||'').replace(/\s+/g,' ').slice(0,600));console.log('BUTTONS:',[...rootEl.querySelectorAll('main button')].map(b=>b.textContent.trim()).join(' | '))
root.unmount(); await server.close(); process.exit(0)

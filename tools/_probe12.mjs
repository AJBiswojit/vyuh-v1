import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window; globalThis.document = window.document
for (const k of ['HTMLElement','Element','Node','Event','CustomEvent','MouseEvent','InputEvent','localStorage','sessionStorage']) globalThis[k] = window[k]
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
const server = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'error' })
const load = (p)=>server.ssrLoadModule(p)
const React=(await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App=(await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const rootEl=window.document.getElementById('root')
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
const txt=()=>(rootEl.querySelector('main')?.textContent||'').replace(/\s+/g,' ').trim()
window.localStorage.clear()
await authService.login({ email:'ananya.sharma@student.vyuhacademy.edu.in', password:authService.demoPassword() })
rootEl.innerHTML=''
const root=createRoot(rootEl)
root.render(React.createElement(MemoryRouter,{initialEntries:['/student/attendance']},React.createElement(App)))
await sleep(2200)
console.log('dialogs present when idle:', rootEl.querySelectorAll('[role="dialog"], [aria-modal="true"]').length)
console.log('toast text present:', /toast/i.test(rootEl.textContent||''))
const before=txt()
const tab=[...rootEl.querySelectorAll('main button')].find(b=>(b.textContent||'').trim()==='Present')
console.log('tab found:', Boolean(tab))
tab?.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,view:window}))
await sleep(900)
const after=txt()
console.log('changed:', before!==after, '| before rows:', (before.match(/%/g)||[]).length, 'after rows:', (after.match(/%/g)||[]).length)
const rows=()=> [...rootEl.querySelectorAll('main tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent.replace(/\s+/g,' ').trim()).join(' | '))
console.log('rows after:'); rows().forEach(r=>console.log('  ',r))
console.log('toast nodes:', [...rootEl.querySelectorAll('[data-toast], .toast')].length, '| text with toast:', (rootEl.textContent||'').includes('toast'))
root.unmount(); await server.close(); process.exit(0)

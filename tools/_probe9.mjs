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
const errs=[]; const oe=console.error; console.error=(...a)=>{const t=a.map(x=>x?.stack||String(x)).join(' '); if(!/act\(|deprecated|Future/i.test(t)) errs.push(t.split('\n')[0])}
console.warn=()=>{}
const server = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'error' })
const load = (p)=>server.ssrLoadModule(p)
const React=(await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App=(await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const rootEl=window.document.getElementById('root')
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
rootEl.innerHTML=''
const root=createRoot(rootEl)
window.localStorage.clear()
await authService.login({ email:'ananya.sharma@student.vyuhacademy.edu.in', password:authService.demoPassword() })
root.render(React.createElement(MemoryRouter,{initialEntries:['/student/doubts']},React.createElement(App)))
await sleep(2500)
const txt=()=> (rootEl.querySelector('main')?.textContent||'').replace(/\s+/g,' ')
console.log('--- initial ---'); console.log(txt().slice(0,300))
const tab=[...rootEl.querySelectorAll('main button, main a')].find(b=>/ai assistant/i.test(b.textContent||''))
tab?.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,view:window}))
await sleep(1500)
console.log('--- assistant tab ---'); console.log(txt().slice(0,300))
const btn=[...rootEl.querySelectorAll('main button, main a')].find(b=>/clear/i.test(b.textContent||''))
console.log('clear button found:', Boolean(btn))
btn?.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,view:window}))
await sleep(1500)
console.log('--- after clear ---'); console.log(txt().slice(-500))
console.log('errors:', errs.slice(0,2))
root.unmount(); await server.close(); process.exit(0)

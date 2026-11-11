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
const { authService, getCurrentSession } = await load('/src/services/auth.service.js')
const rootEl=window.document.getElementById('root')
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms))
window.localStorage.clear()
for(let i=0;i<60;i++){try{await authService.login({email:process.env.EMAIL,password:authService.demoPassword()}); if(getCurrentSession())break}catch{await sleep(20)}}
rootEl.innerHTML=''; const root=createRoot(rootEl)
root.render(React.createElement(MemoryRouter,{initialEntries:[process.argv[2]]},React.createElement(App)))
for (let i=0;i<20;i++){
  await sleep(500)
  const t=(rootEl.querySelector('main')?.textContent||'').replace(/\s+/g,' ').trim()
  console.log(String(i*500).padStart(5)+'ms', t.length, '|', t.slice(0,110))
}
root.unmount(); await server.close(); process.exit(0)

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
globalThis.window = window
globalThis.document = window.document
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.MouseEvent = window.MouseEvent
globalThis.localStorage = window.localStorage
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const noop = class { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = window.ResizeObserver = noop
globalThis.IntersectionObserver = window.IntersectionObserver = noop
globalThis.matchMedia = window.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => server.ssrLoadModule(p)
const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/* full sign-in through the real form */
const { findDOMNode } = await import('react-dom/client')
let root = createRoot(rootEl)
root.render(React.createElement(MemoryRouter, { initialEntries: [process.argv[2] || '/login'] }, React.createElement(App)))
await sleep(1200)
const { default: ReactDOMClient } = await import('react-dom/client')
const setInput = (el, value) => {
  const propsKey = Object.keys(el).find((k) => k.startsWith('__reactProps'))
  const props = el[propsKey]
  props.onChange({ target: { value }, currentTarget: { value } })
}
window.localStorage.clear()
const inputs = [...rootEl.querySelectorAll('input')]
const emailEl = inputs.find((i) => i.type === 'email' || /email/i.test(i.name || '') || /email/i.test(i.placeholder || ''))
const passEl = inputs.find((i) => i.type === 'password')
setInput(emailEl, process.env.EMAIL || 'aarav.mishra@vyuhacademy.edu.in')
setInput(passEl, 'Vyuh@2026')
await sleep(200)
const form = rootEl.querySelector('form')
form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
await sleep(3000)
console.log('--- AFTER SIGN-IN at', process.argv[2] || '/login', '---')
console.log((rootEl.querySelector('main')?.textContent || rootEl.textContent || '').replace(/\s+/g, ' ').slice(0, 220))
root.unmount(); await server.close(); process.exit(0)

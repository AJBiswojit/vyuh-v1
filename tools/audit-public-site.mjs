/* Public-site integrity audit.

   This is the audit for the seven-page public website. It is deliberately split
   into two halves:

     A. Data + source integrity (no browser needed)
        · every media resource points at a file that exists on disk
        · no resource advertises a download it cannot serve
        · programme/subject claims match the seeded academic taxonomy
        · institute contact values match the recorded institute profile
        · no invented fee, deadline, statistic or faculty credential in the copy
        · every internal link in the public data resolves to a real route
        · every capability is labelled shipped / simulated / planned

     B. Rendered-page audit (jsdom, real App tree)
        · all seven pages render with exactly one h1, nav, footer and a title
        · the navbar carries the seven final destinations + Log In
        · the active page is marked with aria-current, including direct entry
        · login, workspace guards and the workspace pages still work
        · the enquiry form validates, saves and refuses to claim delivery

   The checks in B run the production component tree, not a copy of it.

   node tools/audit-public-site.mjs
*/
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const problems = []
const notes = []
let checks = 0

function check(label, condition, detail = '') {
  checks += 1
  if (!condition) problems.push(`${label}${detail ? ` — ${detail}` : ''}`)
}

/* ====================================================================
   A. DATA AND SOURCE INTEGRITY
   ==================================================================== */

const siteFiles = readdirSync(join(ROOT, 'src/data/site')).filter((file) => file.endsWith('.js'))
const { RESOURCES, RESOURCE_CATEGORIES, RESOURCE_KIND_LABELS } = await import(
  join(ROOT, 'src/data/site/resources.js')
)
const { PROGRAMS } = await import(join(ROOT, 'src/data/site/programs.js'))
const { FEATURES, STATUS_LABELS } = await import(join(ROOT, 'src/data/site/learning.js'))
const institute = await import(join(ROOT, 'src/data/site/institute.js'))
const navigation = await import(join(ROOT, 'src/data/site/navigation.js'))
const { INSTITUTE } = await import(join(ROOT, 'src/data/mock/seed.js'))
const { SUBJECTS } = await import(join(ROOT, 'src/data/mock/subjects.mock.js'))
const { USERS } = await import(join(ROOT, 'src/data/mock/users.mock.js'))

check('site data is split into focused modules', siteFiles.length >= 6, siteFiles.join(', '))

/* ---- 1. every media record resolves to a real file ---- */
const mediaResources = RESOURCES.filter((resource) => resource.kind === 'media')
check('at least one real media resource is published', mediaResources.length > 0)
for (const resource of mediaResources) {
  const assetPath = join(ROOT, 'public', resource.asset)
  check(
    `media "${resource.id}" asset exists on disk`,
    existsSync(assetPath) && statSync(assetPath).isFile(),
    resource.asset,
  )
  for (const slide of resource.gallery || []) {
    check(`media "${resource.id}" gallery file exists`, existsSync(join(ROOT, 'public', slide.src)), slide.src)
  }
  if (resource.poster) {
    check(`media "${resource.id}" poster exists`, existsSync(join(ROOT, 'public', resource.poster)), resource.poster)
  }
}

/* ---- 2. no pending resource may carry a downloadable asset ---- */
for (const resource of RESOURCES.filter((entry) => entry.kind === 'pending')) {
  check(`pending "${resource.id}" has no asset`, !resource.asset, String(resource.asset))
  check(
    `pending "${resource.id}" explains why it is not available`,
    Boolean(resource.availabilityNote),
    resource.id,
  )
}

/* ---- 3. kinds and categories are all known ---- */
const categoryIds = new Set(RESOURCE_CATEGORIES.map((category) => category.id))
for (const resource of RESOURCES) {
  check(`resource "${resource.id}" has a known kind`, Boolean(RESOURCE_KIND_LABELS[resource.kind]), resource.kind)
  check(`resource "${resource.id}" has a known category`, categoryIds.has(resource.category), resource.category)
  check(`resource "${resource.id}" has a summary`, Boolean(resource.summary))
  check(`resource "${resource.id}" declares a source`, Boolean(resource.source))
}

/* ---- 4. articles actually carry readable content ---- */
for (const resource of RESOURCES.filter((entry) => entry.kind === 'article')) {
  check(
    `article "${resource.id}" has content blocks`,
    Array.isArray(resource.content) && resource.content.length >= 3,
    String(resource.content?.length),
  )
}

/* ---- 5. programme subjects exist in the shared academic taxonomy ---- */
const subjectNames = new Set(SUBJECTS.map((subject) => subject.name))
for (const program of PROGRAMS) {
  check(`program "${program.id}" has a title`, Boolean(program.title))
  check(`program "${program.id}" lists subjects`, program.subjects.length > 0)
  for (const subject of program.subjects) {
    check(`program "${program.id}" subject "${subject}" is in the taxonomy`, subjectNames.has(subject))
  }
  check(`program "${program.id}" describes assessment`, program.assessment.length >= 2)
  check(`program "${program.id}" describes teaching`, program.teaching.length >= 2)
  check(`program "${program.id}" describes support`, program.support.length >= 2)
  check(`program "${program.id}" has an enquiry topic`, Boolean(program.enquiryTopicId))
}

/* ---- 6. contact values are the recorded institute values, not inventions ---- */
check(
  'contact address matches the institute profile',
  institute.CONTACT_FIELDS.address.value === INSTITUTE.address,
  `${institute.CONTACT_FIELDS.address.value} vs ${INSTITUTE.address}`,
)
check(
  'contact phone matches the institute profile',
  institute.CONTACT_FIELDS.phone.value === INSTITUTE.phone,
  `${institute.CONTACT_FIELDS.phone.value} vs ${INSTITUTE.phone}`,
)
check(
  'admissions email matches the institute profile',
  institute.CONTACT_FIELDS.admissionsEmail.value === INSTITUTE.email,
  `${institute.CONTACT_FIELDS.admissionsEmail.value} vs ${INSTITUTE.email}`,
)
check(
  'office hours are an explicit placeholder, not invented',
  institute.CONTACT_FIELDS.officeHours.value === null,
  String(institute.CONTACT_FIELDS.officeHours.value),
)
check(
  'social accounts are an explicit placeholder, not invented',
  institute.CONTACT_FIELDS.social.value === null,
  String(institute.CONTACT_FIELDS.social.value),
)

/* faculty published publicly must be the seeded faculty, with the seeded titles */
const seededFaculty = USERS.filter((user) => user.role === 'faculty')
for (const educator of institute.EDUCATORS) {
  const match = seededFaculty.find((user) => user.name === educator.name)
  check(`published educator "${educator.name}" is a seeded faculty record`, Boolean(match))
  if (match) {
    check(
      `published educator "${educator.name}" title matches the seeded title`,
      match.title === educator.role,
      `${educator.role} vs ${match.title}`,
    )
  } else {
    check(`no invented educator on the public site (${educator.name})`, false)
  }
}

/* ---- 7. every capability is honestly labelled ---- */
for (const feature of FEATURES) {
  check(`feature "${feature.id}" has a known status`, Boolean(STATUS_LABELS[feature.status]), feature.status)
  check(`feature "${feature.id}" carries a status clarification`, Boolean(feature.honesty))
}
const shipped = FEATURES.filter((feature) => feature.status === 'shipped').length
const simulated = FEATURES.filter((feature) => feature.status === 'simulated').length
notes.push(`capability status: ${shipped} shipped, ${simulated} demonstration-only, ${FEATURES.length - shipped - simulated} planned`)

/* ---- 8. no invented commerce or outcome figures in public copy ---- */
const publicCopy = siteFiles
  .map((file) => readFileSync(join(ROOT, 'src/data/site', file), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, ' ') // strip comments: they discuss what was avoided
const forbidden = [
  [/₹\s?\d/, 'a rupee amount'],
  [/\bINR\s?\d/i, 'an INR amount'],
  [/\b\d{1,2}%\s+(?:off|discount)/i, 'a discount'],
  [/(?:NAAC|NIRF|AICTE|UGC)[- ]?(?:A\+\+|A\+|grade|approved|recognised|recognized)/i, 'an accreditation claim'],
  [/\b(?:ranked|awarded)\s+(?:no\.?\s*)?\d|\b(?:awarded|accredited|affiliated)\s+(?:by|to)\b/i, 'an accreditation claim'],
  [/\b(?:since|est\.?)\s+(?:19|20)\d{2}\b/i, 'a founding date outside the institute record'],
  [/\b\d{2,3}%\s+(?:of our|students (?:scored|qualified|cleared))/i, 'a student-outcome statistic'],
  [/\b(?:last date|deadline)\s*(?:is|:)\s*\d/i, 'an admission deadline'],
]
for (const [pattern, label] of forbidden) {
  const found = publicCopy.match(pattern)
  check(`public copy contains no ${label}`, !found, found ? found[0] : '')
}

/* ---- 9. internal navigation targets all resolve ---- */
const APP_ROUTES = [
  '/',
  '/about',
  '/programs',
  '/learning-experience',
  '/resources',
  '/resources/:resourceId',
  '/admissions',
  '/contact',
  '/legal',
  '/login',
]
const appSource = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8')
for (const route of APP_ROUTES) {
  check(`App.jsx registers ${route}`, appSource.includes(`path="${route}"`), route)
}
for (const item of navigation.PUBLIC_NAV) {
  check(`nav destination ${item.to} is a registered route`, APP_ROUTES.includes(item.to), item.to)
}
for (const column of navigation.FOOTER_COLUMNS) {
  for (const link of column.links) {
    const path = link.to.split('#')[0].split('?')[0]
    check(`footer link ${link.to} resolves`, APP_ROUTES.includes(path) || path.startsWith('/resources/'), link.to)
  }
}
for (const link of navigation.FOOTER_LEGAL) {
  const path = link.to.split('#')[0]
  check(`legal link ${link.to} resolves`, APP_ROUTES.includes(path), link.to)
}

/* ---- 10. the landing page sections are still mounted ---- */
const homePage = readFileSync(join(ROOT, 'src/pages/public/HomePage.jsx'), 'utf8')
const landingSections = [
  'Hero',
  'AboutSection',
  'WaysToLearn',
  'Experts',
  'Capabilities',
  'Process',
  'PrepJourney',
  'Programs',
  'Testimonials',
  'VideoModal',
]
for (const section of landingSections) {
  check(`home page still renders ${section}`, homePage.includes(`<${section}`), section)
}
check('landing page no longer owns a private navbar', !existsSync(join(ROOT, 'src/components/NavBar.jsx')))
check('landing page no longer owns a private footer', !existsSync(join(ROOT, 'src/components/Footer.jsx')))
const navbarCount = readdirSync(join(ROOT, 'src/components/public')).filter((file) => /Navbar/.test(file)).length
check('exactly one public navbar implementation exists', navbarCount === 1, String(navbarCount))

/* ---- 11. vercel.json still rewrites to the SPA shell ---- */
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
const rewrite = (vercel.rewrites || []).find((rule) => rule.destination === '/index.html')
check('vercel.json keeps the SPA rewrite', Boolean(rewrite), rewrite?.source)
if (rewrite) {
  const pattern = new RegExp(`^${rewrite.source}$`)
  for (const route of APP_ROUTES.filter((route) => !route.includes(':'))) {
    check(`rewrite covers ${route}`, pattern.test(route), route)
  }
  check('rewrite does not swallow /assets', !pattern.test('/assets/index-abc.js'))
}

/* ====================================================================
   B. RENDERED PAGES
   ==================================================================== */

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
for (const key of [
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'FocusEvent', 'InputEvent', 'localStorage', 'sessionStorage',
]) {
  globalThis[key] = window[key]
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
const NoopObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.ResizeObserver = window.ResizeObserver = NoopObserver
globalThis.IntersectionObserver = window.IntersectionObserver = NoopObserver
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false
  },
})
globalThis.scrollTo = window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
window.HTMLFormElement.prototype.requestSubmit = function requestSubmit() {
  this.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
}
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
window.HTMLMediaElement.prototype.load = () => {}
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })

const consoleErrors = []
const originalError = console.error
console.error = (...args) => {
  const text = args.map((arg) => arg?.stack || String(arg)).join(' ')
  if (/not wrapped in act|deprecated|React Router Future|Not implemented/i.test(text)) return
  consoleErrors.push(text.split('\n')[0])
  if (process.argv.includes('--verbose')) originalError(...args)
}
console.warn = () => {}
console.info = () => {}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (path) => vite.ssrLoadModule(path)

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const App = (await load('/src/App.jsx')).default
const { authService } = await load('/src/services/auth.service.js')
const { enquiryService, validateEnquiry } = await load('/src/services/enquiry.service.js')

const rootEl = window.document.getElementById('root')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const text = () => (rootEl.textContent || '').replace(/\s+/g, ' ')
let root = null

async function mount(path, { settle = 1500 } = {}) {
  if (root) root.unmount()
  rootEl.innerHTML = ''
  root = createRoot(rootEl)
  root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)))
  await sleep(settle)
  return text()
}

const PAGES = [
  ['/', 'home'],
  ['/about', 'about'],
  ['/programs', 'programs'],
  ['/learning-experience', 'learning'],
  ['/resources', 'resources'],
  ['/admissions', 'admissions'],
  ['/contact', 'contact'],
  ['/legal', 'legal'],
]

window.localStorage.clear()

/* ---- 12. every page renders one h1, nav, footer and a distinct title ---- */
const titles = new Set()
for (const [path, label] of PAGES) {
  consoleErrors.length = 0
  await mount(path, { settle: label === 'home' ? 1700 : 1500 })
  const main = rootEl.querySelector('main')
  const h1s = rootEl.querySelectorAll('h1')
  const nav = rootEl.querySelector('nav[aria-label="Primary"]')
  const footer = rootEl.querySelector('footer')
  const title = document.title
  titles.add(title)

  check(`${label}: renders a <main>`, Boolean(main))
  check(`${label}: exactly one h1`, h1s.length === 1, String(h1s.length))
  check(`${label}: advertises the primary nav`, Boolean(nav))
  check(`${label}: renders the shared footer`, Boolean(footer))
  check(`${label}: has a document title`, Boolean(title) && title !== 'Vite + React + TS', title)
  check(`${label}: rendered without console errors`, consoleErrors.length === 0, consoleErrors[0] || '')
  check(`${label}: has substantive content`, (main?.textContent || '').trim().length > 400)

  const links = [...(nav?.querySelectorAll('ul a') || [])].map((anchor) => anchor.getAttribute('href'))
  check(
    `${label}: nav carries all seven destinations`,
    navigation.PUBLIC_NAV.every((item) => links.includes(item.to)),
    links.join(' '),
  )
  const loginLink = nav?.querySelector('a[href="/login"]')
  check(`${label}: Log In is a separate CTA`, Boolean(loginLink) && /Log In/i.test(loginLink.textContent))

  const current = nav?.querySelector('a[aria-current="page"]')?.getAttribute('href')
  const navOwnsRoute = navigation.PUBLIC_NAV.some((item) => item.to === path)
  if (navOwnsRoute) {
    check(`${label}: active page is marked for direct entry`, current === path, String(current))
  } else {
    /* /legal is reachable from the footer, not the nav; marking nothing is the
       correct behaviour, so assert exactly that. */
    check(`${label}: no nav item falsely claims a page it does not own`, current === undefined, String(current))
  }

  const deadLinks = [...rootEl.querySelectorAll('a[href]')]
    .map((anchor) => anchor.getAttribute('href'))
    .filter((href) => href && href !== '#' && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel'))
    .filter((href) => {
      if (/^\/(assets|media)\//.test(href)) {
        return !existsSync(join(ROOT, 'public', href))
      }
      return false
    })
  check(`${label}: no dead local file links`, deadLinks.length === 0, deadLinks.join(' '))
}
check('every page has its own title', titles.size === PAGES.length, [...titles].join(' | '))

/* ---- 12b. no page duplicates a form control or landmark section ---- */
for (const [path, label] of PAGES) {
  await mount(path, { settle: label === 'home' ? 1700 : 1400 })
  const ids = [...rootEl.querySelectorAll('[id]')].map((element) => element.id)
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
  check(`${label}: no duplicate element ids`, duplicates.length === 0, duplicates.join(' '))
  const primaryNavs = rootEl.querySelectorAll('nav[aria-label="Primary"]').length
  check(`${label}: exactly one primary nav`, primaryNavs === 1, String(primaryNavs))
  const footers = rootEl.querySelectorAll('footer').length
  check(`${label}: exactly one footer`, footers === 1, String(footers))
}

/* ---- 13. active state after client-side navigation ---- */
window.localStorage.clear()
await mount('/about')
rootEl.querySelector('nav[aria-label="Primary"] a[href="/programs"]').click()
await sleep(1400)
check(
  'client-side navigation marks the new page active',
  rootEl.querySelector('nav[aria-label="Primary"] a[aria-current="page"]')?.getAttribute('href') === '/programs',
)

/* ---- 14. resources: filters + search drive the rendered list ---- */
await mount('/resources', { settle: 1600 })
const cardCount = () => rootEl.querySelectorAll('section li article').length
const totalCards = cardCount()
check('resources: every record renders a card', totalCards === RESOURCES.length, `${totalCards}/${RESOURCES.length}`)

const categorySelect = rootEl.querySelector('#resource-category')
categorySelect.value = 'preparation-guides'
categorySelect.dispatchEvent(new window.Event('change', { bubbles: true }))
await sleep(900)
const guides = RESOURCES.filter((entry) => entry.category === 'preparation-guides').length
check('resources: category filter narrows the list', cardCount() === guides, `${cardCount()} vs ${guides}`)

/* reset the category before searching: "preparation-guides" AND "rotational"
   is legitimately empty, which would test the empty state instead of search */
const allChip = [...rootEl.querySelectorAll('button[aria-pressed]')].find(
  (button) => button.textContent.trim() === 'All',
)
allChip.click()
await sleep(900)
check('resources: reset chip restores every record', cardCount() === RESOURCES.length, String(cardCount()))

const searchInput = rootEl.querySelector('#resource-search')
const setValue = (element, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(element, value)
  element.dispatchEvent(new window.Event('input', { bubbles: true }))
}
setValue(searchInput, 'rotational')
await sleep(1100)
const expectedAfterSearch = RESOURCES.filter((entry) =>
  `${entry.title} ${entry.summary} ${entry.source} ${entry.topic || ''}`.toLowerCase().includes('rotational'),
).length
check(
  'resources: search narrows the list',
  cardCount() === expectedAfterSearch && cardCount() > 0,
  `${cardCount()} vs ${expectedAfterSearch}`,
)

setValue(searchInput, 'no-such-resource-anywhere')
await sleep(1100)
check('resources: empty state replaces the grid', /Nothing matches these filters yet/i.test(text()))

const resetButton = [...rootEl.querySelectorAll('button')].find((button) => /^Reset \(/.test(button.textContent.trim()))
check('resources: a reset action is offered when filtered', Boolean(resetButton))
if (resetButton) {
  resetButton.click()
  await sleep(1100)
  check('resources: reset restores every record', cardCount() === RESOURCES.length, String(cardCount()))
  check(
    'resources: reset clears the search box',
    rootEl.querySelector('#resource-search').value === '',
    rootEl.querySelector('#resource-search').value,
  )
}

/* ---- 15. enquiry validation is enforced by the service, not just the UI ---- */
const admissionValid = {
  studentName: 'Ananya Pradhan',
  parentName: 'Rekha Pradhan',
  phone: '+91 98200 11001',
  email: 'ananya@example.com',
  program: 'NEET UG',
  currentClass: 'Class XII',
  message: 'Interested in the NEET programme.',
  consent: true,
}
check('enquiry: a complete admission enquiry validates', validateEnquiry(admissionValid, 'admission').valid)
check(
  'enquiry: missing consent is rejected',
  !validateEnquiry({ ...admissionValid, consent: false }, 'admission').valid,
)
check(
  'enquiry: an invalid email is rejected',
  !validateEnquiry({ ...admissionValid, email: 'nope' }, 'admission').valid,
)
check(
  'enquiry: an unknown programme is rejected',
  !validateEnquiry({ ...admissionValid, program: 'MBBS' }, 'admission').valid,
)
check(
  'enquiry: a contact message needs a message',
  !validateEnquiry({ ...admissionValid, message: '' }, 'contact').valid,
)
check(
  'enquiry: a contact message does not require a programme',
  validateEnquiry(
    { studentName: 'Ravi', email: 'ravi@example.com', topic: 'Website or technical issue', message: 'The map link is broken.', consent: true },
    'contact',
  ).valid,
)

window.localStorage.removeItem('vyuh:public-enquiries:v1')
const saved = await enquiryService.submitEnquiry(admissionValid, { latency: 0 })
check('enquiry: service returns a reference code', /^VYUH-ENQ-\d{4}$/.test(saved.reference), saved.reference)
check(
  'enquiry: service never claims delivery',
  saved.delivered === false && /did not receive/i.test(saved.deliveryNote),
  saved.deliveryNote,
)
check(
  'enquiry: service refuses an invalid record',
  await enquiryService
    .submitEnquiry({ ...admissionValid, email: 'broken' }, { latency: 0 })
    .then(() => false)
    .catch(() => true),
)
const storedRecords = JSON.parse(window.localStorage.getItem('vyuh:public-enquiries:v1') || '[]')
check('enquiry: record is persisted locally', storedRecords.length === 1, String(storedRecords.length))
check(
  'enquiry: storage is separate from the workspace store',
  !window.localStorage.getItem('vyuh:public-enquiries:v1').includes('passwordHash'),
)
enquiryService.clearEnquiries()

/* ---- 16. workspace guard still holds and login still works ---- */
window.localStorage.clear()
const guarded = await mount('/student/dashboard', { settle: 1700 })
check('signed-out workspace deep link is redirected to sign-in', /Sign in|institute email/i.test(guarded))

await authService.login({
  email: 'ananya.sharma@student.vyuhacademy.edu.in',
  password: authService.demoPassword(),
})
const dashboard = await mount('/student/dashboard', { settle: 2400 })
check('student workspace still renders after the public-site work', /Dashboard/i.test(dashboard))
check('student workspace is not the public shell', !rootEl.querySelector('nav[aria-label="Primary"]'))
await authService.logout()
window.localStorage.clear()

/* ---- 17. the public site does not require a session ---- */
await mount('/admissions', { settle: 1600 })
check('public pages render without a session', /Admission journey|Admissions/i.test(text()))

if (root) root.unmount()
await vite.close()

/* ============================== report ============================== */
console.log(`\nPUBLIC SITE — INTEGRITY AUDIT (${checks} checks)`)
if (notes.length) console.log(notes.map((note) => `  · ${note}`).join('\n'))
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM${problems.length === 1 ? '' : 'S'}:\n`)
  for (const problem of problems) console.log(`  ✗ ${problem}`)
  process.exit(1)
}
console.log('\nALL CLEAR — public pages, navigation, filters, enquiries and guards verified.\n')

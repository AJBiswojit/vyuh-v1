# Vyuh Academy — Public Website

**Seven-page public academic-institute site, built as an enhancement of the existing Vyuh landing page.**

Branch `arena/5fdc7c29-vyuh-v1` · React 19 + Vite + JavaScript · no new runtime dependencies.

---

## 1. Pages implemented

| Route | Page file | Title set | h1 (single) |
|---|---|---|---|
| `/` | `src/pages/public/HomePage.jsx` | Vyuh — Focused learning for serious aspirants | With a strong focus on student success through Vyuh |
| `/about` | `AboutPage.jsx` | About — Vyuh Academy | An academic institute built for serious preparation |
| `/programs` | `ProgramsPage.jsx` | Programs — Vyuh Academy | Two examination tracks, one foundation |
| `/learning-experience` | `LearningExperiencePage.jsx` | Learning Experience — Vyuh Academy | Academic teaching, with the evidence built in |
| `/resources` | `ResourcesPage.jsx` | Resources — Vyuh Academy | Resources for serious preparation |
| `/admissions` | `AdmissionsPage.jsx` | Admissions — Vyuh Academy | Admissions for the 2026–27 academic year |
| `/contact` | `ContactPage.jsx` | Contact — Vyuh Academy | Talk to the institute |

Support routes: `/resources/:resourceId` (detail), `/legal` (privacy/data notice), plus an in-layout resource 404 (`ResourceNotFound`) for unknown resource ids.

**Section coverage**

- **Home** — the existing landing page, not a rebuild. All ten sections still render: `Hero`, `AboutSection`, `WaysToLearn`, `Experts`, `Capabilities`, `Process`, `PrepJourney`, `Programs`, `Testimonials`, `VideoModal`. Only the private `NavBar`/`Footer` were removed in favour of the shared public chrome, and the CTAs rewired.
- **About** — hero, Our Story, Vision, Mission, Academic Philosophy, Teaching Methodology, The Vyuh Difference, faculty, closing CTA. Anchors: `#story #vision #mission #philosophy #methodology #difference #team #institute-input`.
- **Programs** — JEE Main & Advanced, NEET UG, and a Foundation track that is actually offered. Each card carries overview, target exam, audience, subject coverage, teaching approach, assessment approach and learning support, plus a comparison table and per-programme enquiry CTA (`#jee #neet #foundation #compare`).
- **Learning Experience** — nine visual feature sections: AI Academic Assistance, Computer-Based Examinations, Detailed Examination Analysis, Live Digital Classrooms, Class Recordings, Performance Intelligence, Attendance Tracking, Faculty Doubt Support, Academic Progress Monitoring. A `#journey` section shows how the capabilities combine across a student's term. Real interface assets (real screenshots, a real playing `.mp4`, real slide PNGs) are used where they exist; simulated capability is recreated from the product's own screen structure and labelled as an interface representation.
- **Resources** — Knowledge Hub over 14 records across all six categories, with search, category filter, exam filter, category chips, URL-synced state (`?q=&category=&exam=`), article detail pages and real file opens for the two records that have files.
- **Admissions** — hero, programmes available, admission journey, eligibility, enquiry form, counselling, FAQ, contact CTA (`#programmes #journey #eligibility #enquiry #counselling #faq`).
- **Contact** — institute details, address with a map link built from the recorded address, phone, email, office hours placeholder, enquiry form, social placeholder (`#details #location #faq`).

---

## 2. Components

**Created — `src/components/public/` (14)**

`PublicLayout` · `PublicNavbar` · `PublicFooter` · `PageHero` · `SectionHeading` · `ProgramCard` · `FeatureCard` · `ResourceCard` · `EnquiryForm` · `ContactInformation` · `FAQAccordion` · `CTASection` · `StatusBadge` · `InterfacePreview`

**Reused from the existing codebase**

The ten landing sections in `src/components/`, `useReveal`, the design tokens in `src/index.css`, `content.js`, the seeded institute/faculty/user records in `src/data/mock/`, `authService` and the whole workspace shell. `NavBar.jsx` and `Footer.jsx` were **deleted** rather than left as a second navigation implementation; `LandingPage.jsx` and `PlaceholderPage.jsx` were superseded by `HomePage.jsx` and the new pages.

**Content separated from presentation — `src/data/site/` (8 modules)**

`institute.js` · `navigation.js` · `programs.js` · `about.js` · `learning.js` · `resources.js` · `admissions.js` · `contact.js`

Pages import data; no copy is hard-coded in a component. Every value that came from an existing record carries its `source`, and everything unpublished is a named placeholder — which makes a future backend swap a data-layer change, not a rewrite.

---

## 3. Routes added

```
/about  /programs  /learning-experience  /resources  /resources/:resourceId
/admissions  /contact  /legal
/pricing → /admissions          /support → /contact?topic=student
```

`/` is eager; every other public route is lazy behind `PublicSuspense`. Workspace routes, `/login`, `/forgot-password`, `/change-password` and `/signup` are untouched. `vercel.json` keeps its SPA rewrite and now demonstrably covers all sixteen routes.

---

## 4. Content placeholders needing institute input

Nothing below is invented; each is rendered as a visible, labelled placeholder.

| Placeholder | Where | What is needed |
|---|---|---|
| Office hours | Contact | Published hours; currently "Office hours have not been published yet." |
| Social media | Contact, footer | Verified accounts; currently "No verified social media accounts are published." |
| Programme fees & payment schedule | Programs, Admissions FAQ | Public fee structure — no figure is displayed |
| Next batch start date & intake size | Programs, Admissions | Cohort dates; "set per cohort" |
| Weekly class timetable | Programs | Published once a batch is confirmed |
| Eligibility / admission criteria | Admissions `#eligibility` | Institute has not published these; stated explicitly rather than restated |
| Admission deadlines | Admissions | Handled by the office, not published |
| Institutional story detail | About `#institute-input` | The institute's own founding account, first cohort, the people who built it |
| Recognition & accreditation | About | Currently no claim is made |
| Student outcomes | About | No result statistics are claimed |
| Address / phone / email confirmation | Contact, footer | Values come from the institute record but are flagged `needsConfirmation` |

The legacy `hello@vyuh.in` mailbox (a different domain from the verified institute domain) was retired; the single verified address **office@vyuhacademy.edu.in** is used everywhere, including the landing-page video modal.

---

## 5. Forms and interactions

**Enquiry form** (`EnquiryForm` + `src/services/enquiry.service.js`) — student name, parent/guardian, phone, email, interested programme, current class, message, consent. The admission and contact variants have **separate rule sets**, so a field that does not exist on one form is never required by it. Validation covers required fields, email shape, phone shape, programme/topic membership, message length and consent, with focus moved to the first invalid field. Either a phone number or an email address must be supplied.

**The submission is a browser-local demonstration and says so.** Records go to `vyuh:public-enquiries:v1` (max 40, reference `VYUH-ENQ-0001`), `delivered` is always `false`, and the confirmation reads "The institute has not received this enquiry". The public store is separate from the workspace store.

**Other interactions** — nav active state via `aria-current`, mobile sheet with scroll lock, outside-click and Escape, FAQ accordion with `aria-expanded`/`aria-controls`, resource filters with URL round-tripping and reset, copy-to-clipboard on contact, map link, back-to-top, scroll reveal, video modal.

---

## 6. Honest capability labelling

Nine capabilities, each carrying one of three badges plus a written status clarification:

- **Working in the product (7)** — CBT examinations and attempts, question-level examination analysis, attendance tracking, class recordings (a real, playable `.mp4`), faculty doubt support, performance intelligence, progress monitoring.
- **Demonstration only (2)** — AI Academic Assistance (deterministic templates, not a live model) and Live Digital Classrooms (participants and polls are simulated; no signalling server in this frontend).
- **Planned (0)** — none are claimed.

---

## 7. Verification

**Build** — `npm run build` ✓ (2.7–3.1 s). `npm run check` ✓ 173 files, every JSX component and hook call resolves.
**Lint** — `npx oxlint` over all public pages, public components, the enquiry service, `src/data/site` and the new audit tool: **0 warnings, 0 errors**. The repo-wide `npm run lint` reports 52 warnings, none of which originate in a public-site file (confirmed by name-filtering the output).

**`tools/audit-public-site.mjs`** (new, `npm run audit:public`) — **344 checks, all clear.** Two halves: data/source integrity (every media record resolves to a real file on disk, no pending record carries a download, programme subjects exist in the shared taxonomy, contact values equal the institute record, published educators equal seeded faculty titles, no invented fee/deadline/statistic/ accreditation, every internal link resolves, `vercel.json` rewrite covers every route and does not swallow `/assets`) and rendered-page audit in jsdom against the real `App` tree (one `h1` per page, one nav, one footer, no duplicate ids, distinct titles, active state on direct entry, filters/search/reset, full enquiry validation against the live service, and workspace guards).

**`tools/audit-routes.mjs`** — extended with a signed-out public block (9 routes × render, active state, shared chrome, reload). **ALL CLEAR.**
**`tools/audit-deployment.mjs`** — extended to 16 routes. Direct request returns the SPA shell for every one; the hashed asset still returns the asset, not the shell.
**Other repo audits** — `audit:identity`, `audit:css`, `audit:header`, `audit:workflows`, `audit:session`, `audit:errors` all pass.

**Browser verification** (real Chromium via puppeteer-core)

- Interaction suite — **40/40**: all 8 nav destinations present and clickable, `aria-current` correct, Log In → `/login`, 14 resource cards, category/exam/search filtering, empty state, reset, direct-URL filter, article detail, media detail with 4 decoded slides, unknown id → 404, 7 field errors on empty submit with focus on `studentName`, invalid email rejected, enquiry saved with reference and persisted locally only, `?programme=neet` and `?topic=student` prefills, FAQ toggle, mobile sheet (7 links + login, scroll lock, close on navigate and Escape).
- Auth and refresh suite — **16/16**: student, faculty and admin all sign in, deep-link refresh keeps the workspace, signed-out deep link redirects to `/login`, and all nine public routes render identically on direct entry and on reload — **no console errors**.
- Responsive sweep — **90 combinations** (9 routes × 10 widths: 1920/1440/1280/1024/900/768/430/390/375/320). No horizontal overflow anywhere, no element escaping the viewport.
- Visual — all eight routes screenshotted at 1440 px and reviewed. Body heights 2954–7634 px, `scrollW === clientW === 1440` on every route.

**Three real bugs were found and fixed by this verification:**

1. **Duplicated filter bar on `/resources`.** A block rewrite left two copies of the search/filter section, producing duplicate element ids and a double toolbar. The duplicate was removed (page height 4103 → 3983 px) and a **duplicate-id + single-nav + single-footer guard** was added to the audit so it cannot return silently.
2. **Stale-closure filter race.** Filter changes rebuilt the query string from a captured snapshot, so a filter change could wipe a freshly typed search term (or vice versa). All URL writes now use React Router's updater form; the search box adopts the URL during render rather than via a syncing effect.
3. **320 px overflow on `/learning-experience`.** A grid child could not shrink below its content width, so the status row pushed the page 32 px wide. Fixed with `minmax(0,1fr)` tracks and a nowrap status row; the mobile category-chip scroller was also clipped so its content can never extend the document.

---

## 8. Remaining limitations

- **The enquiry form does not reach the institute.** It is a frontend demonstration writing to `localStorage`, and both the form and the confirmation say so. A real deployment needs an endpoint behind `enquiryService.submitEnquiry`.
- **Two capabilities are simulated** — AI Academic Assistance is deterministic templating, and Live Digital Classrooms has no signalling server; participant join events and polls are simulated. Both are labelled in the UI.
- **The public site is a static mirror of institute records.** Editing `src/data/site/institute.js` is a manual step; it does not read live from the admin workspace.
- **`/legal` is reachable from the footer, not the navbar** — intentional, and it correctly marks no nav item active.
- **Unpublished facts stay unpublished.** Fees, deadlines, eligibility rules, intake dates, accreditation and outcome statistics are shown as placeholders rather than estimates; the site is honest but visibly incomplete until the institute supplies them.
- **Reproducing the browser checks needs Chromium.** The clipboard, media playback and screenshot suites use a sandbox Chromium build; the committed audits (`audit:public`, `audit:routes`, `audit:deployment`) are the dependency-light equivalent and run in jsdom.
- **Repo-wide lint carries 52 pre-existing warnings** from workspace files that this work did not touch.

# Vyuh stability audit — findings and verification

Date: 11 November 2026 · Branch: `arena/cb71a4e3-vyuh-v1`

This document records what was actually broken, what was changed, and the checks
that were run afterwards. It is a record of evidence, not a claim of perfection:
the "remaining limits" section at the end lists what the audit cannot prove.

---

## 1. Root causes of the blank pages

A passing `vite build` proved nothing here — the app compiled cleanly while three
separate runtime faults were producing exactly the symptom reported.

### 1.1 No error boundary anywhere (systemic)

There was no `ErrorBoundary` in the tree. Any exception during render unmounted
the whole app and left a white screen with no navigation, no message and no way
back. Every one of the following faults was amplified into "blank page" by this.

**Fixed:** `src/ui/ErrorBoundary.jsx`, used twice —
around the routed page inside `WorkspaceLayout` (so a broken section leaves the
sidebar, header and session intact) and around the whole route table in `App.jsx`
(for public pages). The boundary resets on navigation and shows the error message
plus Retry/Reload.

### 1.2 Live exam screen crashed on render (`useMemo is not defined`)

`src/pages/student/ExamLivePage.jsx` used `useMemo` without importing it. The
file compiled, the route mounted, and the page threw the moment it rendered —
a guaranteed blank page for the highest-stakes screen in the product. This was
found only by driving the real exam-taking flow; it is invisible to lint, tests
and the build.

**Fixed:** the import. A new static check (`tools/check-imports.mjs`) now catches
this entire class of bug across all 130 source files.

### 1.3 Student attendance always crashed

`AttendancePage` read `data.subjects`, but `attendanceService.getStudentAttendance`
returns `bySubject`. `data.subjects` was `undefined`, so `.length` threw on first
render — a permanently blank page for the eighth of nine student sections.

**Fixed:** the field name (service contract untouched).

### 1.4 Login raced itself and lost the destination

`LoginPage` had two navigators: a `useEffect` on `isAuthenticated` that always
pushed the role home, and `submit()` that pushed the intended target. Both fired
after a successful sign-in; whichever ran last won. Deep links lost, and the
post-login screen depended on effect ordering.

**Fixed:** one resolver (`destinationFor` in `auth.service.js`) used by the guard,
the sign-in screen and `/app`. The effect stands down while a sign-in is in
flight. The full attempted URL (path + query + hash) survives the detour,
including through a forced password change.

### 1.5 Demo timeline drifted with the real clock

The seed data was authored for 11–13 November 2026 and hard-coded. Once the
clock moved past it, the "live now" session was in the past, the "in progress"
NEET mock window had not opened, and every upcoming class was already over.
Students could not join, faculty had nothing to run, and the roster/attendance
numbers stopped agreeing with the schedule.

**Fixed:** `src/data/mock/demo-timeline.js` rebases the demonstration timeline
onto the current day at seed time (schema version bumped so existing browsers
reseed), anchors the live session to the current hour, opens the live exam now,
pulls scheduled sessions forward, and shifts that session's join/leave events
with it so the faculty register and the student view stay reconciled. Authored
history that is *meant* to be in the past (audit trail, tickets, older
recordings) is untouched.

---

## 2. Other genuine bugs found and fixed

| Area | Bug | File |
| --- | --- | --- |
| Routing | Faculty class studio kept its own state copy of the URL; refresh, back and deep links could disagree | `FacultyClassesPage.jsx` |
| Routing | Deep link into a studio rendered an empty studio while data loaded | `FacultyClassesPage.jsx` |
| Routing | Forced password change forgot where the user was going | `ChangePasswordPage.jsx` |
| Routing | `/change-password` was reachable for signed-out users through a mixed guard | `App.jsx` / `ProtectedRoute.jsx` |
| Data | Faculty class overview never carried `attendanceRecords`, so dashboard and Classes list reported "0 attendance records" for a full register | `live-class.service.js` |
| Data | Existing attempt reported "examination window has closed" instead of "already submitted" after finishing a paper | `attempt.service.js` |
| Data | A published session whose window had closed still offered a Join button that could not work | `live-class.service.js` |
| Data | `clearConversation` returned `{ ok: true }` while the UI expected a thread | `doubt.service.js` |
| UI | Toasts and confirm dialogs survived navigation (a stale "Signed out" toast floated over the landing page) | `ToastProvider.jsx` |
| UI | Logout could leave the user stranded in a workspace if storage threw | `WorkspaceLayout.jsx` |
| UI | Three pages rendered an "empty" state when a request had actually failed (student Exams, faculty Attendance, faculty Question Bank, faculty Doubts) | see §4 |
| UI | Screen-share `ended` listener was never removed | `useLocalMedia.js` |
| UI | Manual refresh replaced content with a skeleton on 29 pages | `src/pages/**` |

---

## 3. Safety nets added

| Check | Command | What it proves |
| --- | --- | --- |
| Static imports | `npm run check` | Every JSX component and hook call resolves to a declaration (catches §1.2) |
| Routes + guards | `npm run audit:routes` | 37 routes render with a heading and no console error; refresh, side-bar clicks, cross-role access, anonymous access, 404, trailing slashes |
| Sections | `npm run audit:sections` | Per role: first paint, refresh parity, every tab/filter, search input, drill-down and back, direct URL |
| Interactions | `npm run audit:interactions` | Every button on every page clicked in isolation — no crash, no console error, no error state |
| Flows | `npm run audit:flows` | Real-DOM journeys: take an exam end to end, build a paper, run a studio, join a classroom, ask a doubt, approve, create an account |
| Workflows | `npm run audit:workflows` | 7 cross-role workflows through the service layer (below) |
| Sessions | `npm run audit:session` | Deactivated account ejected, forced password change un-bypassable and then released, demo data lifecycle, logout |
| Error states | `npm run audit:errors` | All 30 sections under injected transport failure: recoverable message + retry, never blank, never a render crash |
| Paint | `npm run audit:paint` | Time to real content per page |
| Re-render | `npm run audit:rerender` | No refetch loops, no blank screens after settling |
| Responsive | `npm run audit:responsive` | Every section reachable from mobile navigation, every page has a heading |

All audits run against the real application tree (real router, real providers,
real services) inside jsdom, under `StrictMode` — the same double-invocation the
dev server does.

---

## 4. Cross-role workflows (all passing)

1. **Admin creates student → student signs in** — account, one-time credential,
   forced password change, sees batch examinations; deactivated account refused.
2. **Admin creates faculty → faculty signs in** — correct first screen, dashboard
   data loads.
3. **Faculty publishes exam → student sees it** — draft → published, appears in the
   student list, notification delivered.
4. **Student submits attempt → result + analysis** — attempt started, three answers
   saved, submitted, result and question-level analysis load; faculty sees the
   attempt and item analysis includes the paper.
5. **Faculty schedules class → student joins** — session appears for the student,
   faculty starts it, student gets classroom access.
6. **Student raises doubt → faculty replies** — doubt routed to the faculty queue,
   reply recorded, student sees reply and resolved state.
7. **Attendance consistency** — the same session read by faculty register, student
   summary and admin report agrees (94.4% in all three), totals reconcile.

---

## 5. Verification results

```
check-imports    ok: 130 files — every component and hook call declared
oxlint src       0 errors, 30 warnings (advisory: fast-refresh exports,
                 known set-state-in-effect in auth restore, unused demo helpers)
vite build       success in ~2.0s
routes           37/37 CLEAR (all three roles, guards, refresh, sidebar, 404)
sections         9 student + 10 faculty + 11 admin — CLEAN
interactions     30 pages, all controls — CLEAR
flows            7/7 PASS
workflows        8/8 PASS (33 assertions)
session          5/5 pass
error states     30/30 pages show a recoverable error with retry
paint            average 260 ms to real content (slowest 583 ms)
re-render        no refetch loops on any of the 30 pages
responsive       all sections reachable on mobile
```

---

## 6. Remaining limits (stated honestly)

- **No real browser was available in this environment.** Everything above ran in
  jsdom against the real app tree; jsdom has no layout engine, so *visual* issues
  (overflow, contrast, animation jank, true mobile viewport behaviour) were not
  measured. The responsive check verifies navigation reachability and headings,
  not pixels.
- **Production bundles were not executed in a browser** (jsdom does not support
  ES modules in scripts). The production build is verified to compile and every
  deep URL is served correctly by `vite preview`, but the deployed-bundle runtime
  path itself was not exercised here.
- **Classroom media is real, the room is not.** Camera, microphone and screen
  capture use the browser's own device APIs, but participants, chat and polls are
  simulated and no media is transmitted anywhere.
- **Services do not enforce authorisation.** The mock service layer trusts its
  caller; the route guard is the enforcement point. This is documented in
  `docs/VYUH_BACKEND_INTEGRATION_NOTES.md` and is expected for a local demo — a
  real backend must re-check every call.
- **Warnings left in place deliberately.** The 30 lint warnings are advisory:
  fast-refresh export shape, the session-restore `setState` in an effect (the
  correct place for it), and unused demo helpers. None affect behaviour.
- **Bundle size.** `exam.service` (504 kB) and the shell (452 kB) exceed Vite's
  500 kB advisory. Route groups are already code-split per role; further splitting
  was not attempted because it would change module structure without a measured
  user-visible gain.
- **Fonts.** OGG and GILROY are not available; Zodiak + Instrument Serif (display)
  and Switzer + Plus Jakarta Sans (UI) are used as the documented substitution.

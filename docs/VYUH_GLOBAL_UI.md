# Global workspace shell and notification hierarchy

Date: 11 November 2026 · Branch: `arena/02e3e69d-vyuh-v1`

> **Historical baseline.** The verification table in this document describes the
> 30-page shell before the 12 November 2026 workspace enhancements. The shared
> shell behaviour is unchanged, but the current app has 33 sections: 10 Student,
> 10 Faculty and 13 Admin. Current results are recorded in
> `docs/VYUH_ENHANCEMENTS_AUDIT.md`; `docs/VYUH_HEADER_AUDIT.md` is regenerated
> by `npm run audit:header` with the current navigation counts.

## Scope

All changes are applied once in the shared `WorkspaceLayout`,
`NotificationInbox`, navigation and workspace stylesheet. Student, Faculty
and Institute Admin inherit the same behaviour; no role-specific copy of the
shell was introduced and no unrelated workspace page was redesigned.

Locked palette: `#AED9F0` sky, `#F5F0DF` cream, `#242729` charcoal,
`#FFFFFF` white. Amber/cream washes and sky tints use the existing muted
`--warn-*` and `--sky-*` tokens from `workspace.css`. No new palette, no
gradients, no heavy shadow stack, no oversized notification cards.

## Shell changes

| Surface | Before | After |
| --- | --- | --- |
| Sidebar | "Frontend demonstration" card with mock-data copy and Public site link | Removed from every role; navigation owns the full remaining height with rebalanced `pb-5` |
| Desktop header | avatar/initials, name, personal role badge, roll/employee ID, plus a breadcrumb with workspace badge, arrow and current page title | Entire identity and breadcrumb containers removed. Left: responsive navigation toggle only. Right: search + notification bell/unread counter. No replacement element or empty spacer |
| Desktop sidebar footer | personal identity card | **Account** link (`ACCOUNT_PATH[role]`) and **Sign out**; collapsed state has labelled expand / account / sign-out icon buttons |
| Mobile drawer | personal identity card above navigation | Workspace `RoleTag` + "workspace" and the existing **Sign out** action only |

The breadcrumb's `useMemo` crumb derivation, `ChevronRight` import and role-label
rendering were deleted from `WorkspaceLayout`; `activeNavItem` remains only to
highlight the active sidebar link. The page's own `<h1>` and all sidebar
navigation are untouched, and no spacer or replacement element was inserted in
the header.

`ACCOUNT_PATH` in `src/lib/navigation.js` is the single account destination per
workspace. Profile/Account pages remain in `NAV_ITEMS`; profile editing,
password change, account settings, authentication, logout and route guards are
unchanged. The unused `AccountIdentity` component was removed while
`AccountAvatar`, `RoleTag`, `RoleBadge`, `roleTint` and `initialsOf` remain for
account pages, the student dashboard profile card and user tables.

## Notification semantics

`src/lib/notification-visual.js` is the reusable helper. It derives priority
and category from the existing service record — `type`, optional `priority`,
`title` and `body` — and groups the service result into **Important** and
**Updates**. No notification arrays are hardcoded in the UI and no new service
field was added. `notificationService.listForUser`, `markRead` and
`markAllRead` remain the only data source and mutation path, so read state
continues to persist through `mockStorage`.

High priority covers exam reminders / starting soon / schedule changes,
starting or cancelled classes, attendance warnings, deadlines, integrity
alerts, pending approvals and urgent institute announcements. Normal priority
covers doubt replies, recordings, results, routine class updates and general
announcements. Priority and read state are separate: an important row keeps
its warm wash and "Important" chip after it has been read.

| State | Surface | Signals |
| --- | --- | --- |
| Important · unread | `--warn-50` warm amber | sky accent rail, "Important" chip, bold title, sky unread dot, category icon |
| Important · read | `--cream-50` soft cream | cream rail, muted "Important" chip, quieter title/body/timestamp, no dot |
| Normal · unread | `--sky-50` subtle sky | sky rail and dot, standard title, category icon |
| Normal · read | `--surface` white | no rail or dot, muted title/body/timestamp |

Every row has a consistent title → two-line description → timestamp/category
hierarchy, a small icon tile, a hairline separator and a smooth 150 ms hover.
Exam, class, recording, doubt, institute, support, approval and attendance
types get distinct icons and a category label. The panel has a clear heading,
live unread count, "Mark all as read", fixed header/toolbar, a separate
`max-height: min(70vh, 420px)` scrolling list, skeleton loading and an empty
state. Width is `min(92vw, 380px)` with a smaller mobile scroll area.

## Verification

`tools/audit-workspace-shell.mjs` (script `npm run audit:workspace-shell`)
mounts the real app through jsdom + Vite and checks all three roles:

1. no Frontend Demonstration card or Public site link in any sidebar;
2. no profile identity, workspace role badge, breadcrumb arrow or current page
   title in any header; exactly the hamburger + `ml-auto` controls group remain;
3. sidebar footer account link and sign-out without a duplicate identity;
4. collapsed-sidebar sign-out clears the session and the route guard blocks the
   workspace after logout;
5. command search opens; notification panel has heading, unread count and
   mark-all action;
6. important/normal/unread/read/category treatments are present and all four
   priority × read combinations are reachable;
7. "Mark all as read" updates rows, unread counter, bell badge, disabled action
   and service state while keeping important rows identifiable;
8. read state persists in the service, mock store and a fresh mount;
9. profile/account pages still render with editable fields and identity, and
   navigation still links to them;
10. direct URLs, refresh, mobile bottom bar and drawer all work with no console
    errors.

Results: **45/45 checks passed**.

`tools/audit-header.mjs` (`npm run audit:header`) separately mounts ten routes
across the three roles — including Student Dashboard/Exams/Doubts, Faculty
Dashboard/Question Bank and Admin Overview — and captures the actual rendered
`<header>` DOM in `docs/VYUH_HEADER_AUDIT.md`. It asserts no role badge, arrow,
page title, crumb, breadcrumb container or profile identity in the navbar;
exactly two header children (hamburger + `ml-auto` controls); search, mobile
search, notification bell/unread badge, sidebar collapse, bottom navigation,
sidebar links, account link and the page's own `<h1>` all remain. Result:
**12/12 checks passed**.

`tools/audit-identity.mjs` was rewritten to assert the absence of shell
identity blocks and to verify the four remaining identity surfaces (Student
account page and dashboard, Faculty account page, Admin account page) use the
correct role family, role label and defined design tokens. Result:
**IDENTITY CHECKS PASS**.

Other regression results:

| Check | Result |
| --- | --- |
| `npm run audit:workspace-shell` | 45/45 checks across 3 roles |
| `npm run audit:header` | 12/12 rendered-header checks; snapshots in `docs/VYUH_HEADER_AUDIT.md` |
| `npm run audit:identity` | IDENTITY CHECKS PASS |
| `npm run lint` | 0 errors, 52 advisory warnings (pre-existing React hooks / fast-refresh style), 153 files |
| `npm run build` | ✓ built in ~1.9 s; CSS 91.97 kB (pre-existing >500 kB chunk notice) |
| `npm run verify` | `ok: 132 files checked`; `oxlint src`: 0 errors, 34 advisory warnings; ✓ built in 1.73 s |
| `npm run audit:visual` | VISUAL SYSTEM PASS — contrast AA, sky + cream on every screen, ≤1 focal panel |
| `npm run audit:css` | CSS COVERAGE PASS — 17 classes, 29 tokens, 27 utilities emitted |
| `npm run audit:routes` | ALL CLEAR |
| `npm run audit:sections` | SECTION AUDIT CLEAN for Student, Faculty and Admin |
| `node tools/audit-interactions.mjs --role student\|faculty\|admin` | ALL CLEAR for all three roles |
| `npm run audit:workflows` | ALL WORKFLOWS PASS — attendance, session, logout, route guard |
| `npm run audit:flows` | ALL FLOWS PASS — doubts, approvals, user creation, audit log |
| `npm run audit:session` | SESSION AUDIT CLEAN — forced password change, deactivation, refresh/new session, logout |
| `npm run audit:responsive` | RESPONSIVE CHECKS PASS — 17 reachable links per role on mobile |
| `npm run audit:paint` | average 261 ms across 30 pages (slowest `/student/performance` 584 ms) |
| `npm run audit:deployment` | DEPLOYMENT CHECKS PASS — SPA fallback, assets, demo panel, guards |
| `npm run audit:student-exams` | 29/29 — prior Student Exams redesign unaffected |

## Limits

jsdom has no layout engine. These audits verify DOM structure, data
attributes, class families, service state, built CSS and console cleanliness —
not pixels. The dev preview on port 5173 serves the same shared shell for
visual inspection.

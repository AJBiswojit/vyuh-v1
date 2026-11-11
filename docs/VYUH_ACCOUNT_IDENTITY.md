# Account identity and shared workspace shell

Date: 11 November 2026 · Branch: `arena/02e3e69d-vyuh-v1`

## Historical colour fix

Every account identity surface used to tint its avatar from the user's seeded
`avatarTone` field. That field is shuffled per person (8 sky / 6 cream /
4 charcoal across the demo roster), so the colour a label showed had nothing
to do with the role. The fix made `src/ui/account-identity.jsx` the single
source of truth: role-derived avatars, role tags and role badges.

| Role | Family | Chip fill / text | Contrast | Avatar |
| --- | --- | --- | --- | --- |
| Student | sky | `--sky-100` `#e3f2fb` / `#245268` | 7.4:1 | `--sky-200` tint, `#245268` initials |
| Faculty | warm cream | `--cream-200` `#f5f0df` / `#6b5c33` | 5.8:1 | `--cream-300` tint, `#6b5c33` initials |
| Institute Admin | deepest brand blue | `--sky-900` `#1b4057` / `#ffffff` | 10.95:1 | `--sky-900`, white initials |

All values are existing tokens from `src/styles/workspace.css`; no new palette,
no gradients, no new dependency. The seeded `avatarTone` field remains in the
mock data but is not read by identity surfaces.

## Shell simplification (this pass)

The personal identity block was removed from the global header, the desktop
sidebar footer and the mobile drawer for all three roles through the single
`WorkspaceLayout`. Avatar/initials, name, personal role badge and roll /
employee / enrolment ID no longer appear in those shell locations. The
complete breadcrumb (workspace role badge, separator/arrow and current page
title) was also removed from the shared header. Its left side now has only the
responsive navigation toggle; the right side has search, the notification bell
with its unread counter and the other existing controls. No replacement element
or empty spacer was added.

The bottom sidebar section was reduced to essential actions, not replaced with
another information card or a duplicate identity:

- expanded desktop sidebar: **Account** (links to `ACCOUNT_PATH[role]`) and
  **Sign out**;
- collapsed desktop sidebar: expand, account and sign-out icon buttons with
  accessible labels;
- mobile drawer: the workspace role tag + "workspace" and the existing
  **Sign out** action.

`ACCOUNT_PATH` in `src/lib/navigation.js` is the single account destination
per workspace (`/student/profile`, `/faculty/account`, `/admin/account`). Those
pages remain in navigation and keep their role-tinted avatar, role tag, profile
fields, password change and save actions. Authentication, logout, role guards
and routing are untouched.

The obsolete `AccountIdentity` component was removed from the shared UI
module, and the now-unused `ArrowUpRight` import was dropped from
`WorkspaceLayout`. `AccountAvatar`, `RoleTag`, `RoleBadge`, `roleTint` and
`initialsOf` remain because account pages, the student dashboard profile card
and Admin user tables still use them. The inline **Frontend demonstration**
sidebar card (heading, mock-data copy and Public site link) was also removed;
navigation now owns the full remaining height with rebalanced bottom padding,
and no replacement promotional card was introduced.

## Where identity now appears

1. Student profile / Faculty account / Admin account pages — role-coloured
   avatar, role tag, name, email, identifier and editable fields.
2. Student dashboard profile card — the same role-coloured primitives.
3. Admin user-management table — `RoleBadge` per user.
4. Workspace context — `RoleTag` plus "workspace" in the sidebar/drawer.
   This identifies the workspace, not a person.

## Verification

`tools/audit-identity.mjs` mounts the real app (jsdom + Vite
`ssrLoadModule`) for all three demo accounts and checks that:

- no header, sidebar or drawer contains `[data-identity]`;
- the sidebar contains no Frontend demonstration card or Public site link;
- the sidebar role chip is present and correct;
- account-page avatars and role tags use the role-derived family, carry the
  right role and label, and never fall back to a seeded tone;
- every CSS variable used by an identity surface is defined;
- no page logs a console error.

`tools/audit-workspace-shell.mjs` additionally checks the demo card, header
identity/breadcrumb, account link, sign-out (including the collapsed sidebar),
search, notification panel, Profile/Account pages, direct URLs, refresh, mobile
drawer, route guards and state persistence through the real app DOM for Student,
Faculty and Institute Admin.

`tools/audit-header.mjs` (`npm run audit:header`) mounts Dashboard, Exams,
Doubts, Question Bank, Admin Overview and other routes for all three roles,
asserts the navbar has exactly the hamburger and the `ml-auto` controls group,
and captures the rendered `<header>` HTML in `docs/VYUH_HEADER_AUDIT.md`.
Result: **12/12 rendered-header checks passed**; the shared-shell audit is
**45/45**.

See `docs/VYUH_GLOBAL_UI.md` for notification hierarchy and the full regression
matrix.

## Limits

- jsdom has no layout engine, so these audits prove structure, data
  attributes, class families and service state — not pixels. Colour contrast
  above is computed from the hex values, not measured from a screenshot.
- The three demo accounts are the only identities exercised; a newly seeded
  user inherits the same role colours automatically because they come from the
  role, not the user record.

# Account-label colour fix

Date: 11 November 2026 · Branch: `arena/da8d1112-vyuh-v1`

## What was wrong

Every account identity surface in Vyuh tinted its avatar from the user's seeded
`avatarTone` field. That field is shuffled per person (8 sky / 6 cream /
4 charcoal across the demo roster), so the colour a label showed had nothing to
do with the role:

- the sidebar footer could show the Institute Admin in sky and a Student in
  charcoal;
- the header used a separate avatar with no role label at all;
- the three profile/account pages used a hard-coded `bg-[var(--ink)]` avatar and,
  on Student and Faculty, showed no role label — only a roll/employee number and
  a status pill;
- the sidebar role caption was a plain muted string, not a role indicator.

Nothing was broken in the sense of empty output — it was inconsistent, and the
only role signal (a small uppercase word) had no colour and no contrast.

## What changed

Styling now has a single source: `src/ui/account-identity.jsx`.

| Role | Family | Chip fill / text | Contrast | Avatar |
| --- | --- | --- | --- | --- |
| Student | sky | `--sky-100` `#e3f2fb` / `#245268` | 7.4:1 | `--sky-200` tint, `#245268` initials |
| Faculty | warm cream | `--cream-200` `#f5f0df` / `#6b5c33` | 5.8:1 | `--cream-300` tint, `#6b5c33` initials |
| Institute Admin | charcoal | `--ink` `#242729` / `#ffffff` | 15.0:1 | `--ink` tint, white initials |

All values are existing tokens from `src/styles/workspace.css`; no new palette,
no gradients, no new dependency. The chip is a pill with a hairline border of
the same family, uppercase at `0.08em` tracking, so it reads as a label and not
as a button.

Surfaces updated:

1. **Header profile** — avatar + role chip; below `lg` the name is dropped to
   protect header space, from `lg` up it is avatar + name + role chip. Same
   colours as everywhere else.
2. **Sidebar footer** — avatar + name + role chip (+ title when the user has one).
3. **Mobile drawer** — the same identity card above the navigation (the drawer
   is where phones show account identity, since the sidebar footer is desktop-only).
4. **Sidebar role caption** — now the role chip plus the word "workspace".
5. **Student profile / Faculty account / Admin account** — role-coloured avatar
   and a role chip alongside the existing roll/employee number and status pills.
   Layout, copy and fields untouched.

Removed: the local `initials()` helpers and the `Avatar` component in
`WorkspaceLayout` (now a single implementation), and the hard-coded charcoal
avatar on all three account pages. The seeded `avatarTone` field stays in the
mock data unused by identity surfaces, so nothing else that reads it changed.

## Verification

`tools/audit-identity.mjs` mounts the real app (jsdom + Vite `ssrLoadModule`) for
all three demo accounts and inspects every identity surface by its role data
attribute, at dashboard and account-page routes, with the mobile drawer opened:

```
STUDENT — expected sky
  · header        name="Ananya Sharma"      chip="Student"        chip=sky    avatar=sky/student
  · sidebar       name="Ananya Sharma"      chip="Student"        chip=sky    avatar=sky/student
  · drawer        name="Ananya Sharma"      chip="Student"        chip=sky    avatar=sky/student
  · account page  name="Ananya Sharma"      chip="Student"        chip=sky    avatar=sky/student

FACULTY — expected cream
  · header        name="Aarav Mishra"       chip="Faculty"        chip=cream  avatar=cream/faculty
  · sidebar       name="Aarav Mishra"       chip="Faculty"        chip=cream  avatar=cream/faculty
  · drawer        name="Aarav Mishra"       chip="Faculty"        chip=cream  avatar=cream/faculty
  · account page  name="Aarav Mishra"       chip="Faculty"        chip=cream  avatar=cream/faculty

ADMIN — expected ink
  · header        name="Dr. Meera Kulkarni" chip="Institute Admin" chip=ink    avatar=ink/admin
  · sidebar       name="Dr. Meera Kulkarni" chip="Institute Admin" chip=ink    avatar=ink/admin
  · drawer        name="Dr. Meera Kulkarni" chip="Institute Admin" chip=ink    avatar=ink/admin
  · account page  name="Dr. Meera Kulkarni" chip="Institute Admin" chip=ink    avatar=ink/admin
```

The audit fails the build if a surface disagrees on family, if a chip carries
another role, if any identity avatar still reports a seeded tone (`sky` /
`cream` / `charcoal` instead of a role), if a class list paints with a CSS
variable that is not defined in `src/styles`, or if any page logs a console error.

Regression checks after the change:

| Check | Result |
| --- | --- |
| `node tools/audit-identity.mjs` | pass — 12 surfaces, 3 roles, 6 tokens all defined |
| `node tools/audit-routes.mjs` | ALL CLEAR |
| `node tools/audit-sections.mjs` | clean (9 student sections) |
| `node tools/audit-interactions.mjs` | ALL CLEAR |
| `node tools/audit-responsive.mjs` | pass — 17 reachable links per role on mobile |
| `node tools/audit-workflows.mjs` | ALL WORKFLOWS PASS |
| `node tools/check-imports.mjs` | ok — 131 files |
| `npx oxlint src` | 0 errors, 33 warnings (advisory, pre-existing) |
| `npm run build` | ✓ built in ~1.7 s |

## Limits

- jsdom has no layout engine, so this proves structure, class family and
  presence — not pixels. Colour contrast above is computed from the hex values,
  not measured from a screenshot.
- The three demo accounts are the only identities exercised; a newly seeded user
  inherits the same role colours automatically because they come from the role,
  not from the user record.

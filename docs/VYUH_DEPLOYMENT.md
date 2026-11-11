# Vyuh deployment notes

Production URL: <https://vyuh-v1.vercel.app> · Repository: `AJBiswojit/vyuh-v1` ·
Production branch: `main` (the repository default branch).

## Building

```
npm ci          # or npm install
npm run build   # vite build → dist/
```

Vite emits `dist/index.html` plus `dist/assets/*` and copies `public/`
(`favicon.svg`, `media/`) to the root of `dist/`.

`vercel.json` at the repository root pins the settings so they cannot drift
from the project structure:

| Setting | Value | Why |
| --- | --- | --- |
| `framework` | `vite` | tells Vercel the build command and output directory |
| `buildCommand` | `npm run build` | same command used locally and in CI |
| `outputDirectory` | `dist` | matches Vite's default; **not** `build`, **not** `.` |
| `rewrites` | everything except `/assets/*`, `/media/*`, `/favicon.svg`, `/robots.txt` → `/index.html` | SPA fallback for React Router |
| `headers` | `index.html` no-cache; `/assets/*` immutable | hashed filenames can be cached forever, the shell cannot |
| `redirects` | none | redirects run *before* the filesystem and would break assets |

**Root Directory / Installation settings live in the Vercel project, not in this
file.** They must be:

- **Root Directory**: repository root (leave blank) — the repository root is
  where `package.json` and `vite.config.js` live.
- **Output Directory**: leave blank (the framework preset supplies `dist`); if
  it is set explicitly it must be `dist`.
- **Build Command**: leave blank (preset) or `npm run build`.
- **Install Command**: leave blank (preset) or `npm ci`.

Do not commit `dist/` — it is git-ignored and rebuilt by Vercel.

## The SPA rewrite, explained

React Router uses the History API, so `/student/dashboard` is a *client* route:
no file of that name exists on the server. Without a rewrite, Vercel's static
handler looks for `dist/student/dashboard`, finds nothing and serves its own
infrastructure `404: NOT_FOUND` page — which is not the app, so React Router
never runs.

The rewrite is deliberately not a bare `/(.*)` → `/index.html`. Vercel checks
the filesystem before applying rewrites, so files that exist are still served;
but excluding `/assets/*`, `/media/*`, `/favicon.svg` and `/robots.txt`
explicitly means a missing or mistyped asset returns a real 404 instead of an
HTML page with a `200`, which is far easier to debug.

## Verifying a deployment

```bash
npm run audit:deployment
```

`tools/audit-deployment.mjs` does four things:

1. validates `vercel.json` against the build output (rewrite matches app routes,
   ignores real assets, no `redirects`);
2. builds a **local HTTP server that behaves like Vercel** — file on disk wins,
   then the rewrite, otherwise 404 — and issues a direct request for every route
   that was reported broken;
3. renders the login page and asserts the seeded demo accounts are present,
   fillable, and not gated on `import.meta.env.DEV`;
4. signs in as each role and refreshes deep links into that role's workspace,
   including a check that a student is still stopped by the guard on
   `/admin/overview`.

Run it after `npm run build`.

## Demo credentials

The login page shows a demo-accounts panel in **every** build, because Vyuh
signs in against a seeded mock service layer (`src/data/mock/`), not a backend.
The accounts are read from that seed through `authService.getDemoAccounts()` —
never hard-coded in the component — and the password is the seeded
`DEMO_PASSWORD`.

To hide the panel in a build that points at a real backend, set
`VITE_SHOW_DEMO_ACCOUNTS=false` in that Vercel environment. Note that this only
hides the UI: the mock credentials remain in the client bundle while the mock
service layer ships, so a real deployment must also remove the mock layer. No
real secret, key or production password is present in this repository or its
bundle.

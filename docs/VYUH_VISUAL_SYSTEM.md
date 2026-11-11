# Vyuh visual identity system

Date: 11 November 2026 · Branch `arena/da8d1112-vyuh-v1`

The workspaces previously resolved to white cards, charcoal buttons, grey
borders and monochrome charts. This pass builds one colour system out of the
four locked brand colours and applies it through shared tokens and components
rather than per-page CSS.

Everything here lives in `src/styles/workspace.css`, `src/ui/workspace-kit.jsx`,
`src/ui/charts.jsx` and `src/ui/account-identity.jsx`.

---

## 1. Palette

The brand colours are unchanged. Each was extended into a family so a surface
can sit at a different depth without leaving the brand.

| Family | Anchor (locked) | Extended steps | Used for |
| --- | --- | --- | --- |
| Sky blue | `#aed9f0` = `--sky-300` | 50 `#f4fafd`, 100 `#e3f2fb`, 200 `#cbe7f6`, 400 `#8ec6e4`, 500 `#6aaed2`, 600 `#4a8fb5`, 700 `#2f6b8c`, **800 `#23536e`**, **900 `#1b4057`** | information surfaces, primary actions, active navigation, focus |
| Warm cream | `#f5f0df` = `--cream-200` | 50 `#fdfbf5`, 100 `#f9f5e9`, 300 `#e9e1c8`, 400 `#d9cda6`, 500 `#b9a97a`, 700 `#8a7a4e`, **800 `#6b5c33`**, **900 `#564a26`** | profile / reflection panels, recommendations, recording and resource surfaces |
| Charcoal | `#242729` = `--ink` | ink-80…ink-30, `--line`, `--line-strong` | typography, hairlines, icon strokes. **No longer a large surface colour.** |
| White | `#ffffff` | `--surface-muted`, `--surface-sunken`, `--canvas` | cards, breathing space, reading surfaces |

Added semantic families (deliberately muted so a page can hold all three
without becoming a traffic light):

| State | Fill | Text | Contrast |
| --- | --- | --- | --- |
| Correct / healthy | `--good-100 #eaf3e7` | `--good-800 #2f532c` | 7.7:1 |
| Caution | `--warn-100 #faf1da` | `--warn-800 #6d5312` | 6.4:1 |
| Incorrect / at risk | `--bad-100 #fbeeee` | `--bad-700 #8c2f2f` | 7.2:1 |

## 2. Colour carries meaning

The rule every screen follows — this is what stops "paint everything blue":

| Surface | Meaning | Class | Limit |
| --- | --- | --- | --- |
| White card | neutral content: lists, tables, forms | `.surface-flat` | the default |
| Sky card | information, quick actions, selected state | `.surface-sky` / `.surface-sky-rail` | a few per screen |
| Cream card | "about you", reflection, recommendations | `.surface-cream` / `.surface-cream-rail` | a few per screen |
| Deep blue | the one focal panel: live session, attempt in progress | `.surface-deep` | **max one per screen** |
| Coloured rail | dense pages where a full tint would fight content | `.surface-accent-top`, `.card-rule` | — |

`.surface-ink` survives as an alias of `.surface-deep`, so existing `tone="ink"`
call sites now render brand blue instead of charcoal.

Charcoal is now confined to typography and hairlines. The audit asserts that no
workspace screen paints a flat charcoal block at all.

## 3. The shell

- **Canvas** (`--canvas #f7fafc`) carries a low-opacity wash of sky and cream, so
  the page ground is never flat grey.
- **Sidebar** is warm paper with a sky wash at the top; the active nav item is a
  sky chip (`--sky-100` fill, `--sky-900` text, `--sky-600` rail) instead of a
  white card with a charcoal rail.
- **Header** keeps the glass treatment; the role crumb is a sky pill.
- **Page eyebrow** (`PageHeader`) is a sky pill with a dot rather than grey
  letterspaced text. Faculty pages pass `eyebrowTone="cream"`, admin pages
  `eyebrowTone="cream"`, so workspace identity is visible at the top of every
  page as well as in the account chip.

## 4. Controls

| Control | Treatment | Notes |
| --- | --- | --- |
| `.btn-primary` | deep blue gradient `--sky-700 → --sky-800` | was charcoal; 5.8:1 with white |
| `.btn-secondary` | white + hairline, hovers to sky | |
| `.btn-tertiary` | warm cream (`--cream-200` / `--cream-900`) | new; for a second emphasis next to a primary |
| `.btn-sky` | brand sky fill, deep blue text | |
| `.btn-ghost` | transparent → sky wash on hover | |
| `.segmented` / `.segmented-item` | stone track, white selected pill with sky text | new; used for role filters |
| `.tab` | selected tab gets a sky underline and a soft sun-rise wash | |
| `.badge` (base) | stone tint, not white | so a chip never disappears |
| `.badge-outline` | white with a sky hairline | |
| Focus | `--sky-700` outline everywhere, 2px | |

## 5. Charts

`src/ui/charts.jsx` exports `CHART_TONE`:

```
primary  #23536e   deep blue — score, attendance, first series
sky      #6aaed2   comparison / second series
skyLight #aed9f0   filled areas, radar
cream    #b9a97a   time, effort, neutral magnitude
good     #5d9153   correct
warn     #c0a047   caution
bad      #bd6a6a   incorrect
track    #e8f1f6   empty track in donuts and bars
```

Series are handed out in that order, so adjacent charts never repeat a colour.
Areas carry that colour as a gradient (26% → 2%); grids are tinted blue-grey.
Legends use `.legend-key` with the matching key colour rather than default
Recharts swatches.

## 6. Account identity

Unchanged in structure (one source: `src/ui/account-identity.jsx`) but retuned:

| Role | Chip | Avatar |
| --- | --- | --- |
| Student | `--sky-100` / `--sky-800` | `--sky-200` tint |
| Faculty | `--cream-200` / `--cream-800` | `--cream-300` tint |
| Institute admin | `--sky-900` / white | `--sky-900` |

Admin moved from charcoal to the deepest brand blue so that "high contrast"
means "deepest brand colour" rather than black. `RoleBadge` was added for the
user-management table: same family, plus a status dot, so account tables show
role colour instead of a grey tag.

## 7. Screen-by-screen

**Student dashboard** — cream profile card (avatar, role chip, roll/enrolment,
goal as a cream note strip); sky next-examination card with three figure boxes;
attendance donut on the deep-blue/semantic scale with a threshold badge; deep
blue live-session panel *or* sky upcoming-class card (the dark card is gone);
quick actions as tone-varied tiles with icon chips; cream latest-result card
with a strength badge and marks/accuracy boxes; sky insight panel; cream
recordings panel.

**Examination analysis** — four metric tiles on a deliberate scale (marks =
deep, accuracy = good/warn/bad by value, attempted = sky, average time = cream)
each with a progress bar and a stated fair-share reference; time distribution on
cream with a legend; section performance on graded bands; the three insight
cards are sky / cream / white; recommendations are tinted by priority; question
grid cells use the semantic map with a status dot legend. **Fixed while doing
this:** the question-level tab threw on an undefined `style` variable — the tab
never rendered.

**Faculty dashboard** — sky/cream/warn stat tiles, sky attendance card with
legend, cream doubts panel, white pipeline, sky "start a live session" strip,
deep blue live banner.

**Faculty question bank** — cream eyebrow, three-tone summary strip, sky filter
bar, subject chips in sky, difficulty chips green/amber/red, selected row with a
sky rail, cream preview panel.

**Admin overview** — deep/sky/cream stat tiles for the first three counts, sky
attendance card, cream academics card with insights in white cards.

**Admin user management** — cream eyebrow, sky summary strip, segmented role
filter, avatar + role badge per row, cream pager.

## 8. Verification

`tools/audit-visual-system.mjs` (jsdom + `ssrLoadModule`) checks, on all six
screens:

- **contrast** — every text/surface pair computed from the real hex values
  clears WCAG AA 4.5:1 (lowest is 5.02:1, faculty chip on cream);
- **surface spread** — each screen carries at least two of white / sky / cream;
- **focal restraint** — at most one deep-blue panel per screen;
- **no charcoal blocks**;
- **semantic badges** — no white-in-disguise pills;
- **analysis tabs** — Subject, Topic and Question level all open, and every
  question cell exposes a readable status in its accessible name.

`tools/audit-css-coverage.mjs` reads the **built** stylesheet and asserts every
new token, component class and arbitrary-value utility is actually emitted.
This matters because an unparseable Tailwind arbitrary value fails silently —
the code looks right and the screen stays grey. The audit also self-tests its
own matcher.

Results after this pass:

| Check | Result |
| --- | --- |
| `audit-visual-system.mjs` | pass — 6 screens, 17 contrast pairs AA, ≤1 focal panel |
| `audit-css-coverage.mjs` | pass — 17 classes, 29 tokens, 27 utilities in the bundle |
| `audit-identity.mjs` | pass — 12 surfaces across 3 roles |
| `audit-routes.mjs` | ALL CLEAR (37 routes) |
| `audit-sections.mjs` | clean |
| `audit-interactions.mjs` | ALL CLEAR |
| `audit-responsive.mjs` | pass — 17 reachable links per role |
| `audit-workflows.mjs` | ALL WORKFLOWS PASS |
| `check-imports.mjs` | ok — 131 files |
| `oxlint src` | 0 errors, 34 advisory warnings (pre-existing) |
| `npm run build` | built in ~1.7 s |

## 9. What was not touched

- The landing page (`src/pages/LandingPage.jsx`, `src/components/*`, `index.css`,
  `main.jsx`) is byte-identical; it styles itself with Tailwind's `charcoal` /
  `sky` / `cream`.
- Typography, routing, auth, services and mock data are unchanged.
- No new dependency was added.

## 10. Honest limits

- **No screenshots.** This environment has no browser binary (the bundled
  Chromium lacks `libnspr4`/`libnss3` and package mirrors are unreachable), so
  the six screens could not be captured or compared visually here. Everything
  above is verified structurally: computed contrast, class/token presence in the
  built bundle, surface distribution per screen, and navigation through each of
  the six screens. A visual pass in a real browser is still worth doing — the
  dev server is running for exactly that.
- jsdom has no layout engine, so spacing, overflow and animation smoothness are
  reasoned about from the classes, not measured.
- Fonts remain the documented substitution: OGG → Zodiak (+ Instrument Serif),
  Gilroy → Switzer (+ Plus Jakarta Sans).

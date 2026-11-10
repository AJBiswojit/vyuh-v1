# Vyuh — Landing Page

A close recreation of the supplied reference design for the Vyuh learning platform:
sky-blue atmospheric hero dissolving into warm cream, editorial serif/sans type pairing,
and a restrained, mostly card-free editorial composition.

**Stack:** React 19 · Vite · JavaScript (no TypeScript) · Tailwind CSS · React Router

---

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
npm run preview
```

---

## Design system (locked)

| Token | Value | Where it is used |
| --- | --- | --- |
| Sky Blue | `#AED9F0` | Hero sky base, capability icon wells, nav highlight, hero side block fills |
| Warm Cream | `#F5F0DF` | Hero lower fade, the full About band, footer |
| Charcoal | `#242729` | All type, dark buttons, icons, arrow buttons |
| Pure White | `#FFFFFF` | Content surfaces, cards, nav, hero video frame |

Exposed as Tailwind colours `sky`, `cream`, `charcoal`. **No other hue appears anywhere.**

### Hero cloud atmosphere
The hero is a layered composition, not a flat gradient:
1. base sky gradient (`#A9D6EF → #AED9F0 → airy white → #FAF8EF`) across the hero band,
2. a generated cloud photograph (`public/assets/clouds-hero.webp`, 9.6 KB) as a single
   non-repeating `cover` layer, opacity 0.82, masked top and bottom so the very top reads as
   clean sky and the texture dissolves into the cream before the About band,
3. a soft daylight wash plus cream graduation on `::after`.
No stars, birds, sun, particles or decorative objects are used.

### Atmosphere / haze
The reference shows these four colours through a very soft white veil — measured on the
reference, `#F5F0DF` reads as `rgb(245,245,239)` and `#AED9F0` as `rgb(188,225,246)`, both of
which are the palette colour composited under ~14% white. That is reproduced literally with a
fixed, non-interactive `.page-haze` overlay (`--haze: 0.14`) rather than by inventing off-palette
tints. The lower marketing bands are near-white rather than cream because in the reference only
the About band and the footer read as cream; cream at full strength under cards looked wrong and
was the single largest colour deviation from the reference, now corrected.

### Typography — honest note on font files

The brief asks for **OGG + GILROY**. Both are commercial, licensed typefaces and are not
redistributable, so they cannot be bundled. Instead of silently shipping a generic fallback, the
two closest open-licence equivalents are **self-hosted locally** (no CDN, no network needed):

| Role | Commercial target | Bundled substitute | Why |
| --- | --- | --- | --- |
| Editorial / display | **OGG** | **Zodiak Regular** (`src/fonts/Zodiak-Regular.woff2`) | High-contrast display serif with tapered stems — closest visual match to Ogg |
| UI / functional | **GILROY** | **Switzer Regular + Medium** (`src/fonts/Switzer-*.woff2`) | Geometric-humanist sans with the compact, round terminals Gilroy uses |
| Secondary serif fallback | — | Instrument Serif (`src/fonts/InstrumentSerif-Regular.woff2`) | Graceful degradation if Zodiak fails |

Zodiak and Switzer are by Indian Type Foundry, free for commercial use (Fontshare licence).
Instrument Serif is SIL OFL.

**To swap in licensed OGG + Gilroy:** drop the `.woff2` files into `src/fonts/` and edit only the
`@font-face` blocks at the top of `src/index.css` — every component resolves type through
`serif-word`, `font-serif` and `font-sans`, so nothing else changes.

Mixed serif/sans headlines (“With a *strong* focus on … through *Vyuh*”, “*More* ways to learn”,
“*Plan* your preparation”, “*Your* potential”, “learners *trust* Vyuh”) use `.serif-word`, exactly
mirroring the reference.

---

## Structure

```
src/
  components/
    NavBar.jsx          floating translucent pill nav + mobile sheet
    Hero.jsx            headline, video-call frame, floating testimonial + 25K stat
    AboutSection.jsx    "Plan your preparation / build your success" + stat row
    WaysToLearn.jsx     three learning cards
    Experts.jsx         three educator portrait cards
    Capabilities.jsx    five compact capability cards (icons overhang the card top)
    Process.jsx         01 / 02 / 03 gradient result cards
    PrepJourney.jsx     "Every step brings you closer" — 3 connected stages (NEW)
    Programs.jsx        "One platform. Different ambitions." — JEE / NEET / Academic (NEW)
    Testimonials.jsx    three testimonial cards + prev/next controls
    Footer.jsx          logo + footer nav
    VideoModal.jsx      accessible dialog behind "Watch Video" / the hero call button
    Icons.jsx           inline SVG icon set + logo/wordmark
  hooks/useReveal.js    IntersectionObserver fade-up + scroll lock
  content.js            all copy, stats, cards and links in one place
  pages/                LandingPage + routed destination pages
public/assets/          optimised WebP imagery (11 files, ~300 KB total)
source-assets/masters/  original generated PNGs (not served)
```

### Sections, in reference order

1. Navigation — transparent pill, white active "Home" pill, Log In / Sign Up
2. Hero — sky→white→cream gradient with soft clouds, mixed serif/sans headline
3. About Vyuh — two-column editorial layout, mentor portrait, stat row with separators
4. More ways to learn — three cards with full-bleed editorial illustrations
5. Our Experts — heading block + three portrait cards
6. Capabilities — five compact cards with overhanging circular icons
7. Reduce effort, maximize results — 01 / 02 / 03 gradient cards
8. **Your Preparation Journey** — Understand / Practice / Improve (new section 01)
9. **Preparation that fits your goals** — JEE / NEET / Academic Learning (new section 02)
10. Testimonials — three cards with circular prev/next
11. Footer — logo, wordmark, About / Programs / Support / Contact

Navigation carries Home · Features · Programs · Resources · Pricing on the left/centre and
**Log In only** on the right — there is no Sign Up button anywhere (desktop or mobile sheet).

---

## Imagery

Every image is a purpose-made generated asset — no stock photos, no placeholders, no reuse of one
person across cards.

| File | Used by | Notes |
| --- | --- | --- |
| `hero-educator.webp` | Hero video frame | Background removed (transparent cutout) |
| `about-mentor.webp` | About section | Background removed (transparent cutout) |
| `card-structured.webp` | Learning card 01 | Full-bleed sky→cream panel |
| `card-practice.webp` | Learning card 02 | Full-bleed sky→cream panel |
| `card-resources.webp` | Learning card 03 | Full-bleed sky→cream panel |
| `expert-01.webp` | Aarav Mishra | Pastel sky background |
| `expert-02.webp` | Rohan Sen | Pastel cream background |
| `expert-03.webp` | Vikram Das | Pastel sand background |
| `learner-ananya.webp` | Ananya Pradhan | Testimonial avatar |
| `learner-ritwik.webp` | Ritwik Sahoo | Testimonial avatar |
| `learner-sneha.webp` | Sneha Mohanty | Testimonial avatar |
| `clouds-hero.webp` | Hero background | Generated cloud texture, single cover layer |
| `journey-understand.webp` | Journey 01 | Full-bleed sky→cream panel |
| `journey-practice.webp` | Journey 02 | Full-bleed sky→cream panel |
| `journey-improve.webp` | Journey 03 | Full-bleed sky→cream panel |
| `program-jee.webp` | JEE Preparation | Full-bleed sky→cream panel |
| `program-neet.webp` | NEET Preparation | Full-bleed sky→cream panel |
| `program-academic.webp` | Academic Learning | Full-bleed sky→cream panel |

`hero-educator.webp` and `about-mentor.webp` are **transparent (alpha) cutouts** — re-generating
them requires re-running background removal, not just a resize, or the subject will sit on a black
plate. This is the one asset step that must not be shortcut.

All three expert portraits were re-generated in one pass so face scale, framing and lighting are
consistent across the trio. All three illustrations were re-generated full-bleed in one pass so the
art direction matches. Masters live in `source-assets/masters/`.

---

## Behaviour & accessibility

- Subtle fade-up reveals (`IntersectionObserver`, one-shot), gentle float on the two hero side
  blocks, soft hover elevation on cards. All motion respects `prefers-reduced-motion`.
- No fake controls: nav links, card arrows, "Explore More", footer links and the hero call button
  all route or open something real.
- Semantic landmarks, one `h1`, alt text on every image, visible focus rings, skip link,
  `Esc` closes the dialog and the mobile menu, scroll lock while either is open.
- Measured text contrast (WCAG AA): hero body 10.0:1, card body 15.0:1, footer links 13.2:1.

---

## Validation performed

- `npm run build` clean; `npx oxlint src` → 0 warnings, 0 errors.
- Headless Chromium at 1920 / 1440 / 1280 / 1024 / 768 / 430 / 390 / 375 / 320 px: zero horizontal
  overflow, zero elements breaking the viewport box, zero broken images, zero console/page errors.
- All internal routes return HTTP 200; hash targets resolve; dialog opens/closes; testimonial
  rotation works; mobile sheet opens, contains all links + Log In, and routes correctly.
- Sign Up absent from desktop nav and mobile sheet; Log In functional at both sizes.
- Only `hero-educator` is eager + `fetchpriority="high"`; the other 16 images are `loading="lazy"`.
- Palette audit: no rendered colour has saturation above the locked four-colour system.

---

## Note on the reference artefact

The supplied reference is a **presentation board of two scaled artboards** (desktop on the left,
a smaller mobile-width artboard on the right), not a single full-page screenshot. As a
consequence its type is proportionally larger relative to the section blocks than a real
desktop page can be at a normal reading scale. The implementation matches the reference's
*composition, proportions and colour* faithfully while keeping type at natural, legible sizes
(hero ~76px at 1440px). Pushing the type to the reference's literal ratio would require either a
page 3× taller or unreadably small body text, so that specific mismatch is a deliberate,
documented deviation rather than an oversight.

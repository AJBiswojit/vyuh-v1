/* Built-CSS coverage audit.

   Tailwind drops any utility it cannot parse or find in the content globs. An
   arbitrary-value class like `bg-[var(--sky-100)]` that never reaches the
   bundle fails *silently* — the element simply keeps its inherited colour. In
   a colour redesign that is the worst possible failure: the code looks right
   and the screen stays grey.

   This audit builds nothing itself; run `npm run build` first. It reads the
   emitted stylesheet and asserts that every token, component class and
   arbitrary-value utility the new visual system relies on is actually present.

   node tools/audit-css-coverage.mjs */
import { readdirSync, readFileSync, existsSync } from 'node:fs'

const distDir = new URL('../dist/assets/', import.meta.url)
if (!existsSync(distDir)) {
  console.log('no dist/ — run `npm run build` first')
  process.exit(1)
}

const files = readdirSync(distDir).filter((f) => f.endsWith('.css'))
if (!files.length) {
  console.log('dist/assets has no stylesheet')
  process.exit(1)
}

const css = files.map((f) => readFileSync(new URL(f, distDir), 'utf8')).join('\n')

/* self-test: the checks below must be able to fail. If a deliberately bogus
   token is "found", the matcher is broken and the whole audit is meaningless. */
const selfTest = !css.includes('--definitely-not-a-token')
if (!selfTest) {
  console.log('audit self-test failed: matcher reports a token that cannot exist')
  process.exit(1)
}

/* component classes defined in src/styles/workspace.css */
const COMPONENT_CLASSES = [
  'surface-cream-rail',
  'surface-sky-rail',
  'surface-deep',
  'surface-accent-top',
  'stat-tile',
  'stat-icon',
  'stat-tile-hint',
  'page-eyebrow',
  'card-rule',
  'legend-key',
  'note-strip',
  'row-selected',
  'segmented',
  'segmented-item',
  'btn-tertiary',
  'badge-neutral',
  'ws-sidebar',
]

/* custom properties that must survive into the bundle */
const TOKENS = [
  '--sky-50',
  '--sky-100',
  '--sky-200',
  '--sky-300',
  '--sky-500',
  '--sky-700',
  '--sky-800',
  '--sky-900',
  '--cream-50',
  '--cream-100',
  '--cream-200',
  '--cream-300',
  '--cream-500',
  '--cream-800',
  '--cream-900',
  '--good-100',
  '--good-300',
  '--good-500',
  '--good-800',
  '--warn-100',
  '--warn-300',
  '--warn-500',
  '--warn-800',
  '--bad-100',
  '--bad-300',
  '--bad-500',
  '--bad-700',
  '--canvas',
  '--surface-sunken',
]

/* arbitrary-value utilities the pages use inline; Tailwind must have emitted a
   rule for each of these class names */
const UTILITIES = [
  'bg-[var(--sky-50)]',
  'bg-[var(--sky-100)]',
  'bg-[var(--sky-800)]',
  'bg-[var(--sky-900)]',
  'bg-[var(--cream-100)]',
  'bg-[var(--cream-200)]',
  'bg-[var(--cream-50)]',
  'bg-[var(--good-100)]',
  'bg-[var(--warn-100)]',
  'bg-[var(--bad-100)]',
  'bg-[var(--good-50)]',
  'bg-[var(--bad-50)]',
  'bg-[var(--warn-50)]',
  'border-[var(--sky-200)]',
  'border-[var(--cream-300)]',
  'border-[var(--good-300)]',
  'border-[var(--bad-300)]',
  'text-[var(--sky-800)]',
  'text-[var(--sky-900)]',
  'text-[var(--cream-900)]',
  'text-[var(--good-800)]',
  'text-[var(--warn-800)]',
  'text-[var(--bad-700)]',
  'shadow-[inset_0_3px_0_var(--good-500)]',
  'shadow-[inset_0_3px_0_var(--warn-500)]',
  'shadow-[inset_0_3px_0_var(--bad-500)]',
  'shadow-[inset_0_0_0_1px_var(--sky-200)]',
]

/** Tailwind escapes arbitrary values in selectors: [ -> \[, ( -> \(, etc. */
const escapeClass = (cls) =>
  cls.replace(/[()[\]{}.+*?^$|\\/#%,:']/g, (ch) => `\\${ch}`).replace(/ /g, '\\ ')

const problems = []

for (const name of COMPONENT_CLASSES) {
  if (!css.includes(`.${name}{`) && !css.includes(`.${name},`) && !css.includes(`.${name} `)) {
    problems.push(`component class missing from bundle: .${name}`)
  }
}

for (const token of TOKENS) {
  if (!css.includes(`${token}:`)) problems.push(`design token missing from bundle: ${token}`)
}

for (const utility of UTILITIES) {
  /* Tailwind escapes every special character in the class name, so look for the
     emitted selector (`.<escaped class>{`) rather than rebuilding a regex. */
  const needle = `.${escapeClass(utility)}{`
  if (!css.includes(needle)) {
    problems.push(`utility not emitted by Tailwind (would silently do nothing): ${utility}`)
  }
}

/* the built stylesheet must not still ship the old monochrome defaults */
const REGRESSIONS = [
  { pattern: /\.badge\s*\{[^}]*background:\s*var\(--white\)/, label: 'base .badge still paints pure white' },
  { pattern: /\.btn-primary\s*\{[^}]*background:\s*var\(--ink\)/, label: '.btn-primary still paints charcoal' },
]

for (const check of REGRESSIONS) {
  if (check.pattern.test(css)) problems.push(check.label)
}

console.log(`\nchecked ${files.join(', ')} (${(css.length / 1024).toFixed(0)} kB)`)
console.log(`  · ${COMPONENT_CLASSES.length} component classes`)
console.log(`  · ${TOKENS.length} design tokens`)
console.log(`  · ${UTILITIES.length} arbitrary-value utilities`)

if (problems.length) {
  console.log('')
  for (const problem of problems) console.log(`  x ${problem}`)
  console.log(`\n${problems.length} CSS COVERAGE PROBLEM(S)\n`)
  process.exit(1)
}
console.log('\nCSS COVERAGE PASS (every new colour class is emitted in the built bundle)\n')

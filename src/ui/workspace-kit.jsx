import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

/* Shared workspace building blocks: page header, bento tiles, status badges,
   progress bars, timelines and list rows. */

export function PageHeader({ eyebrow, eyebrowTone = 'sky', title, description, actions, backTo, backLabel }) {
  return (
    <div className="mb-5">
      {backTo ? (
        <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
          ← {backLabel || 'Back'}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="page-eyebrow mb-2" data-tone={eyebrowTone}>
              {eyebrow}
            </p>
          ) : null}
          <h1 className="display-lg text-ink">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

const TONE_CLASS = {
  sky: '!bg-[var(--sky-100)] !text-[var(--sky-800)] !border-[var(--sky-200)]',
  cream: '!bg-[var(--cream-200)] !text-[var(--cream-800)] !border-[var(--cream-300)]',
  ink: '!bg-[var(--sky-900)] !text-white !border-[var(--sky-900)]',
  good: '!bg-[var(--good-100)] !text-[var(--good-800)] !border-[var(--good-300)]',
  warn: '!bg-[var(--warn-100)] !text-[var(--warn-800)] !border-[var(--warn-300)]',
  danger: '!bg-[var(--bad-100)] !text-[var(--bad-700)] !border-[var(--bad-300)]',
  neutral: '!bg-[var(--surface-sunken)] !text-[var(--ink-80)] !border-[var(--line-strong)]',
}

export function StatusBadge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span className={`badge ${TONE_CLASS[tone] || TONE_CLASS.neutral} ${className}`}>
      {dot ? <span className="dot" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export function statusTone(status) {
  const map = {
    published: 'good',
    completed: 'sky',
    live: 'danger',
    'in-progress': 'sky',
    draft: 'cream',
    scheduled: 'sky',
    cancelled: 'danger',
    archived: 'cream',
    ended: 'sky',
    'recording-processing': 'warn',
    'recording-published': 'good',
    active: 'good',
    inactive: 'danger',
    open: 'warn',
    answered: 'sky',
    resolved: 'good',
    closed: 'cream',
    'waiting-for-student': 'cream',
    pending: 'warn',
    'part-paid': 'sky',
    paid: 'good',
    overdue: 'danger',
    approved: 'good',
    rejected: 'danger',
    expired: 'warn',
    submitted: 'good',
    'not-started': 'cream',
    present: 'good',
    absent: 'danger',
    partial: 'warn',
    excused: 'sky',
    'not-eligible': 'neutral',
    failed: 'danger',
    success: 'good',
    clear: 'good',
    flagged: 'warn',
    removed: 'danger',
    'pending-approval': 'warn',
    'window-closed': 'cream',
    upcoming: 'sky',
    'live-window': 'danger',
    processing: 'warn',
    unpublished: 'cream',
    restricted: 'danger',
    'in-progress-ticket': 'warn',
  }
  return map[status] || 'neutral'
}

const EXACT_STATUS_LABELS = {
  'waiting-for-student': 'Waiting for Student',
  'in-progress': 'In Progress',
  'part-paid': 'Part Paid',
  'not-eligible': 'Not Eligible',
  success: 'Successful',
  failed: 'Failed',
}

export function statusLabel(status) {
  if (!status) return '—'
  const key = String(status)
  if (EXACT_STATUS_LABELS[key]) return EXACT_STATUS_LABELS[key]
  return key
    .split('-')
    .map((word, index) => (index > 0 && ['for', 'and', 'of'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

const BENTO_TONE = {
  default: { className: 'surface', rule: 'sky', deep: false },
  sky: { className: 'surface-sky-rail', rule: 'sky', deep: false },
  cream: { className: 'surface-cream-rail', rule: 'cream', deep: false },
  deep: { className: 'surface-deep', rule: 'deep', deep: true },
  ink: { className: 'surface-deep', rule: 'deep', deep: true },
}

/**
 * Bento tile. `tone` chooses the surface family: white (default), sky
 * information, cream reflection, or deep blue for the single focal panel on a
 * screen. Deep panels are styled explicitly at the call site; the others share
 * one typographic scale so tiles read as a family.
 */
export function BentoCard({
  eyebrow,
  title,
  children,
  footer,
  action,
  className = '',
  tone = 'default',
  span = '',
  delay = 0,
}) {
  const reduceMotion = useReducedMotion()
  const config = BENTO_TONE[tone] || BENTO_TONE.default
  const deep = config.deep
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={`${config.className} ${span} flex flex-col p-4 sm:p-[18px] ${className}`}
      data-tone={tone}
    >
      {(eyebrow || title || action) ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {eyebrow ? (
              <p className={deep ? 'text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/70' : 'label-xs'}>
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className={`mt-0.5 text-[14px] font-medium leading-snug ${deep ? 'text-white' : 'text-ink'}`}>
                {title}
              </h2>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? (
        <div className={`mt-3 border-t pt-2.5 ${deep ? 'border-white/20' : tone === 'cream' ? 'border-[var(--cream-300)]' : 'border-[var(--line)]'}`}>
          {footer}
        </div>
      ) : null}
    </motion.section>
  )
}

/**
 * Number tile used by dashboards. Tone maps to meaning: white neutral, cream
 * reflective, sky informational, deep for the leading metric on a page.
 */
export function StatTile({ label, value, hint, icon: Icon, tone = 'default', to, className = '' }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="label-xs">{label}</p>
        {Icon ? (
          <span className="stat-icon" data-tone={tone === 'deep' ? 'deep' : tone === 'cream' ? 'cream' : tone === 'good' ? 'good' : tone === 'warn' ? 'warn' : 'sky'}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="stat-figure mt-2 text-ink">{value}</p>
      {hint ? <p className="stat-tile-hint">{hint}</p> : null}
    </>
  )
  const toneAttr = tone === 'default' ? undefined : tone
  if (to) {
    return (
      <Link to={to} className={`stat-tile ${className}`} data-tone={toneAttr}>
        {body}
      </Link>
    )
  }
  return (
    <div className={`stat-tile ${className}`} data-tone={toneAttr}>
      {body}
    </div>
  )
}

export function ProgressBar({ value, max = 100, tone = 'ink', height = 6, label, className = '' }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  const fill =
    tone === 'sky'
      ? 'bg-[var(--sky-500)]'
      : tone === 'deep'
        ? 'bg-[var(--sky-800)]'
        : tone === 'good'
          ? 'bg-[var(--good-500)]'
          : tone === 'danger'
            ? 'bg-[var(--bad-500)]'
            : tone === 'warn'
              ? 'bg-[var(--warn-500)]'
              : tone === 'cream'
                ? 'bg-[var(--cream-500)]'
                : 'bg-[var(--sky-700)]'
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between text-[11px]">
          <span className="text-muted">{label}</span>
          <span className="tabular font-medium text-ink">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="w-full overflow-hidden rounded-full bg-[var(--sky-50)]" style={{ height }}>
        <motion.div
          className={`h-full rounded-full ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

export function Timeline({ items, emptyLabel = 'No activity yet' }) {
  if (!items.length) return <p className="py-6 text-center text-[12px] text-soft">{emptyLabel}</p>
  return (
    <ol className="relative space-y-3.5 pl-4">
      <span className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--sky-200)]" aria-hidden="true" />
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={`absolute -left-4 top-1 h-[9px] w-[9px] rounded-full border-2 border-white ${
              item.tone === 'sky' ? 'bg-[var(--sky-500)]' : item.tone === 'warn' ? 'bg-[var(--warn-500)]' : item.tone === 'danger' ? 'bg-[var(--bad-500)]' : 'bg-[var(--sky-800)]'
            }`}
            aria-hidden="true"
          />
          <p className="text-[12.5px] font-medium leading-snug text-ink">{item.title}</p>
          {item.body ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{item.body}</p> : null}
          <p className="mt-0.5 text-[10.5px] uppercase tracking-wide text-soft">{item.meta}</p>
        </li>
      ))}
    </ol>
  )
}

export function ListRow({ to, title, subtitle, meta, right, badge, icon: Icon, onClick }) {
  const content = (
    <>
      {Icon ? (
        <span className="stat-icon mt-0.5 !h-8 !w-8">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{title}</span>
          {badge}
        </span>
        {subtitle ? <span className="mt-0.5 block truncate text-[11.5px] text-muted">{subtitle}</span> : null}
        {meta ? <span className="mt-0.5 block text-[10.5px] uppercase tracking-wide text-soft">{meta}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-right">{right}</span> : null}
    </>
  )

  const className =
    'flex w-full items-start gap-2.5 rounded-[12px] px-2.5 py-2.5 text-left transition hover:bg-[var(--sky-50)]'

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}

export function LinkedSection({ title, description, to, linkLabel, children, className = '' }) {
  return (
    <section className={`surface-flat p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-medium text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{description}</p> : null}
        </div>
        {to ? (
          <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-link hover:underline">
            {linkLabel || 'View all'} <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

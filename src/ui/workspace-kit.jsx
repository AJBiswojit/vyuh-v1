import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

/* Shared workspace building blocks: page header, bento tiles, status badges,
   progress bars, timelines and list rows. */

export function PageHeader({ eyebrow, title, description, actions, backTo, backLabel }) {
  return (
    <div className="mb-5">
      {backTo ? (
        <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
          ← {backLabel || 'Back'}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="label-xs mb-1.5">{eyebrow}</p> : null}
          <h1 className="display-lg text-ink">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

const TONE_CLASS = {
  sky: 'bg-[var(--sky-100)] text-[#245268] border-[var(--sky-200)]',
  cream: 'bg-[var(--cream-100)] text-[#6b5c33] border-[var(--cream-300)]',
  ink: 'bg-[var(--ink)] text-white border-[var(--ink)]',
  good: 'bg-[#eef5ec] text-[#375f34] border-[#cfe0c9]',
  warn: 'bg-[var(--cream-100)] text-[#7a6220] border-[#e3d5a8]',
  danger: 'bg-[#fbeeee] text-[#8c2f2f] border-[#e8c9c9]',
  neutral: 'bg-white text-[var(--ink-70)] border-[var(--line)]',
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
    completed: 'neutral',
    live: 'danger',
    'in-progress': 'sky',
    draft: 'neutral',
    scheduled: 'sky',
    cancelled: 'danger',
    archived: 'neutral',
    ended: 'neutral',
    'recording-processing': 'warn',
    'recording-published': 'good',
    active: 'good',
    inactive: 'danger',
    open: 'warn',
    answered: 'sky',
    resolved: 'good',
    closed: 'neutral',
    pending: 'warn',
    approved: 'good',
    rejected: 'danger',
    expired: 'warn',
    submitted: 'good',
    'not-started': 'neutral',
    present: 'good',
    absent: 'danger',
    partial: 'warn',
    excused: 'sky',
    clear: 'good',
    flagged: 'warn',
    removed: 'danger',
    'pending-approval': 'warn',
    'window-closed': 'neutral',
    upcoming: 'sky',
    'live-window': 'danger',
    processing: 'warn',
    unpublished: 'neutral',
    restricted: 'danger',
    'in-progress-ticket': 'warn',
  }
  return map[status] || 'neutral'
}

export function statusLabel(status) {
  if (!status) return '—'
  return String(status)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

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
  const toneClass =
    tone === 'sky'
      ? 'surface-sky'
      : tone === 'cream'
        ? 'surface-cream'
        : tone === 'ink'
          ? 'surface-ink'
          : 'surface'
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={`${toneClass} ${span} flex flex-col p-4 sm:p-[18px] ${className}`}
    >
      {(eyebrow || title || action) ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {eyebrow ? <p className={`label-xs ${tone === 'ink' ? 'text-white/60' : ''}`}>{eyebrow}</p> : null}
            {title ? (
              <h2 className={`mt-0.5 text-[14px] font-medium leading-snug ${tone === 'ink' ? 'text-white' : 'text-ink'}`}>
                {title}
              </h2>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? <div className={`mt-3 border-t pt-2.5 ${tone === 'ink' ? 'border-white/15' : 'border-[var(--line)]'}`}>{footer}</div> : null}
    </motion.section>
  )
}

export function ProgressBar({ value, max = 100, tone = 'ink', height = 6, label, className = '' }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  const fill =
    tone === 'sky' ? 'bg-[var(--sky-500)]' : tone === 'good' ? 'bg-[#4c7a45]' : tone === 'danger' ? 'bg-[#9d3c3c]' : tone === 'warn' ? 'bg-[#b08d31]' : 'bg-[var(--ink)]'
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between text-[11px]">
          <span className="text-muted">{label}</span>
          <span className="tabular font-medium text-ink">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]" style={{ height }}>
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
      <span className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--line)]" aria-hidden="true" />
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={`absolute -left-4 top-1 h-[9px] w-[9px] rounded-full border-2 border-white ${
              item.tone === 'sky' ? 'bg-[var(--sky-500)]' : item.tone === 'warn' ? 'bg-[#b08d31]' : item.tone === 'danger' ? 'bg-[#9d3c3c]' : 'bg-[var(--ink)]'
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
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-ink-60">
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

export function StatTile({ label, value, unit, hint, delta, to, tone = 'default' }) {
  const body = (
    <>
      <p className="label-xs">{label}</p>
      <p className={`stat-figure mt-2 ${tone === 'danger' ? 'text-[#8c2f2f]' : tone === 'good' ? 'text-[#375f34]' : 'text-ink'}`}>
        {value}
        {unit ? <span className="ml-1 font-sans text-[12px] font-normal tracking-normal text-soft">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-soft">{hint}</p> : null}
      {delta ? <p className="mt-1 text-[10.5px] font-medium text-[#375f34]">{delta}</p> : null}
    </>
  )
  const className = 'surface-flat block p-4 transition'
  if (to) {
    return (
      <Link to={to} className={`${className} hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-sm)]`}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
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

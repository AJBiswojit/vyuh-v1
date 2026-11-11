import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from 'lucide-react'
import Button from './Button.jsx'

/* ------------------------------ loading ------------------------------ */

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function LoadingBlock({ label = 'Loading', rows = 4, className = '' }) {
  return (
    <div className={`surface-flat p-5 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {label}…
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className={`h-4 ${index === rows - 1 ? 'w-2/3' : index % 2 ? 'w-5/6' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-flat p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/* -------------------------------- empty ------------------------------ */

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '', compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-muted)] text-soft">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-[14px] font-medium text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-[380px] text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/* -------------------------------- error ------------------------------ */

export function ErrorState({ error, onRetry, title = 'Something went wrong', className = '', compact = false }) {
  const message =
    error?.message || (typeof error === 'string' ? error : 'The data could not be loaded. Please try again.')
  return (
    <div
      role="alert"
      className={`rounded-[var(--radius-md)] border border-[#e8c9c9] bg-[#fdf6f6] ${compact ? 'p-4' : 'p-6'} ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8c2f2f]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#7d2b2b]">{title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#7d2b2b]/80">{message}</p>
          {error?.code ? (
            <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-wide text-[#7d2b2b]/60">code: {error.code}</p>
          ) : null}
          {onRetry ? (
            <Button size="sm" className="mt-3" icon={RefreshCw} onClick={onRetry} variant="secondary">
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- modal ------------------------------ */

export function Modal({ open, onClose, title, description, children, footer, size = 'md', labelledBy }) {
  const panelRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => {
      const target = panelRef.current?.querySelector('input, textarea, select, button')
      target?.focus()
    }, 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      clearTimeout(timer)
    }
  }, [open, onClose])

  const width = size === 'lg' ? 'max-w-[760px]' : size === 'xl' ? 'max-w-[960px]' : size === 'sm' ? 'max-w-[400px]' : 'max-w-[560px]'

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[92] flex items-end justify-center bg-[rgba(20,22,24,0.42)] p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy || 'modal-title'}
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.995 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-[22px] border border-[var(--line)] bg-white shadow-[var(--shadow-lg)] sm:rounded-[20px]`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <div className="min-w-0">
                <h2 id={labelledBy || 'modal-title'} className="text-[15px] font-medium text-ink">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="icon-btn shrink-0" aria-label="Close dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-[var(--line)] bg-[var(--surface-muted)] px-5 py-3">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

/* -------------------------------- drawer ----------------------------- */

export function Drawer({ open, onClose, title, description, children, footer, width = 'max-w-[440px]' }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[93] flex justify-end bg-[rgba(20,22,24,0.34)] backdrop-blur-[1px]">
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? false : { x: 28, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { x: 28, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className={`flex h-full w-full ${width} flex-col border-l border-[var(--line)] bg-white shadow-[var(--shadow-lg)]`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium text-ink">{title}</h2>
                {description ? <p className="mt-1 text-[12px] text-muted">{description}</p> : null}
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? <div className="border-t border-[var(--line)] bg-[var(--surface-muted)] px-5 py-3">{footer}</div> : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

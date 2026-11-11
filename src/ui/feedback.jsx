import { createContext, useContext, useEffect, useRef } from 'react'
import { AlertTriangle, Loader2, Check, X, Info } from 'lucide-react'

/* Toast + confirm-dialog infrastructure. Every asynchronous action in the
   application reports through toasts; every destructive action confirms
   through a promise-based dialog. */

export const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Safe fallback so a component rendered outside a provider never crashes.
    return {
      push: (message) => console.info('[toast]', message?.title || message),
      success: (title) => console.info('[toast]', title),
      error: (title) => console.warn('[toast]', title),
      info: (title) => console.info('[toast]', title),
    }
  }
  return context
}

export const ConfirmContext = createContext(null)

export function useConfirm() {
  return useContext(ConfirmContext) || (async () => true)
}

const TONES = {
  success: { icon: Check, className: 'border-[var(--good-300)] bg-[var(--good-50)] text-[var(--good-800)]' },
  error: { icon: AlertTriangle, className: 'border-[var(--bad-300)] bg-[var(--bad-100)] text-[var(--bad-700)]' },
  info: { icon: Info, className: 'border-[var(--line-strong)] bg-white text-ink' },
  loading: { icon: Loader2, className: 'border-[var(--line-strong)] bg-white text-ink' },
}

export function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone] || TONES.info
        const Icon = tone.icon
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-[380px] items-start gap-2.5 rounded-[14px] border px-3.5 py-3 shadow-[var(--shadow-md)] ${tone.className}`}
            style={{ animation: 'toast-in 180ms cubic-bezier(0.22,0.61,0.36,1)' }}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toast.tone === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium leading-snug">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[11.5px] leading-snug opacity-75">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-full p-0.5 opacity-60 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}

/** Promise-based confirmation dialog with focus management. */
export function ConfirmDialog({ request, onResolve }) {
  const confirmRef = useRef(null)
  useEffect(() => {
    if (!request) return
    const timer = setTimeout(() => confirmRef.current?.focus(), 40)
    const onKey = (event) => {
      if (event.key === 'Escape') onResolve(false)
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [request, onResolve])

  if (!request) return null
  const { title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', details } = request

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[rgba(20,22,24,0.42)] p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-description' : undefined}
        className="w-full max-w-[440px] rounded-[20px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-[var(--bad-100)] text-[var(--bad-700)]' : 'bg-[var(--sky-100)] text-[var(--sky-800)]'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-[15px] font-medium leading-snug text-ink">
              {title}
            </h2>
            {description ? (
              <p id="confirm-description" className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
            {details?.length ? (
              <ul className="mt-3 space-y-1 border-t border-[var(--line)] pt-3">
                {details.map((detail) => (
                  <li key={detail.label} className="flex items-baseline justify-between gap-3 text-[12px]">
                    <span className="text-soft">{detail.label}</span>
                    <span className="text-right font-medium text-ink">{detail.value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onResolve(false)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`btn btn-sm ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => onResolve(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

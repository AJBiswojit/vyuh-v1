/**
 * Shared loading fallback for lazily-loaded route groups.
 *
 * Deliberately sizeable: an unannounced white screen is indistinguishable from
 * a broken app, so every Suspense boundary in Vyuh renders this instead.
 */
export default function RouteFallback({ label = 'Loading', fullHeight = false }) {
  return (
    <div
      className={`flex items-center justify-center ${fullHeight ? 'min-h-screen bg-[var(--surface-muted)]' : 'min-h-[50vh]'}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--ink)]" />
        {label}…
      </div>
    </div>
  )
}

import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * React error boundary.
 *
 * Without one, any throw during render unmounts the whole tree and the user is
 * left with a white screen and no way back — which is exactly what a blank page
 * looks like in this app. Every workspace section is wrapped in one of these so
 * a single broken page degrades to an explanation plus recovery actions instead
 * of taking the shell (and the session) down with it.
 *
 * `resetKey` (usually the current pathname) clears a captured error whenever the
 * user navigates, so a bad page never poisons the next one.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, resetKey: props.resetKey }
    this.retry = this.retry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error, info) {
    // Surfaced loudly on purpose: a crash is a bug, not an empty state.
    console.error('[vyuh] a section failed to render', error, info?.componentStack)
  }

  retry() {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const page = this.props.variant === 'page'
    if (!error) return this.props.children
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.retry)
    }
    return (
      <div className={page ? 'flex min-h-screen items-center justify-center bg-[var(--surface-muted)] p-6' : ''}>
        <div className={`surface-flat p-6 ${page ? 'w-full max-w-[560px]' : ''}`} role="alert">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cream-200)] text-[#8a6d1f]">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] font-medium text-ink">
                {page ? 'This page could not be displayed' : 'This section could not be displayed'}
              </h2>
              <p className="mt-1 max-w-[520px] text-[12px] leading-relaxed text-muted">
                {page
                  ? 'The app hit an unexpected error while rendering. Reloading usually clears it — your demo data and session are stored on this device.'
                  : 'The page hit an unexpected error while rendering. The rest of your workspace still works — use the navigation on the left, or retry this section.'}
              </p>
              <p className="mt-2 rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-1.5 font-mono text-[11px] text-ink-70">
                {error?.message || 'Unknown error'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={this.retry}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
                {page ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
                    Reload Vyuh
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

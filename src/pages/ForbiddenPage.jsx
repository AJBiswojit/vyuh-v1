import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Logo, Wordmark } from '../components/Icons.jsx'
import { ROLE_LABELS } from '../lib/navigation.js'

export default function ForbiddenPage({ currentRole, attemptedPath, homePath }) {
  return (
    <div className="sky-canvas flex min-h-screen flex-col">
      <div className="shell flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <Wordmark />
        </Link>
        <Link to={homePath || '/'} className="btn btn-secondary btn-sm">
          Go to my workspace
        </Link>
      </div>
      <main className="shell flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[520px] rounded-[24px] border border-white/80 bg-white/92 p-7 text-center shadow-[var(--shadow-md)] backdrop-blur">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cream-200)] text-[#7a6220]">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-serif text-[27px] leading-tight tracking-[-0.02em] text-ink">This area is not yours</h1>
          <p className="mx-auto mt-2 max-w-[400px] text-[12.5px] leading-relaxed text-muted">
            You are signed in as <strong className="font-medium text-ink">{ROLE_LABELS[currentRole] || 'a user'}</strong>.
            {attemptedPath ? (
              <>
                {' '}
                <code className="rounded bg-[var(--surface-sunken)] px-1 py-0.5 font-mono text-[11px]">{attemptedPath}</code> belongs to a
                different workspace.
              </>
            ) : (
              ' That route belongs to a different workspace.'
            )}{' '}
            Each role can only open its own sections.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link to={homePath || '/'} className="btn btn-primary btn-sm">
              Open my workspace
            </Link>
            <Link to="/" className="btn btn-secondary btn-sm">
              Public site
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

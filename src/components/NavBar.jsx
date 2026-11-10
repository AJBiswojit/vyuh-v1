import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo, Wordmark, MenuIcon, CloseIcon } from './Icons'
import { NAV_LINKS } from '../content'
import { useScrollLock } from '../hooks/useReveal'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="relative z-40">
      <div className="shell pt-5 sm:pt-7">
        <nav
          aria-label="Primary"
          className="relative flex items-center justify-between rounded-full border border-white/75 bg-white/10 px-2.5 py-1.5 backdrop-blur-[6px] sm:px-4 lg:py-2"
        >
          <Link to="/" className="flex items-center gap-2.5 rounded-full pl-1 pr-2 sm:gap-3">
            <Logo className="h-[30px] w-[30px] sm:h-[34px] sm:w-[34px]" />
            <Wordmark />
            <span className="sr-only">Vyuh home</span>
          </Link>

          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/80 px-1.5 py-1.5 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = link.active && pathname === '/'
              return (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex rounded-full px-3.5 py-1.5 text-[13px] transition duration-300 ease-calm ${
                      isActive
                        ? 'bg-white font-medium text-charcoal'
                        : 'text-charcoal/75 hover:bg-white/50 hover:text-charcoal'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden rounded-full border border-white/80 px-5 py-2 text-[13px] font-medium text-charcoal transition duration-300 ease-calm hover:bg-white/60 sm:inline-flex"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/40 text-charcoal lg:hidden"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </nav>

        {open && (
          <div
            id="mobile-nav"
            className="mt-3 rounded-[26px] border border-white/80 bg-white/95 p-5 shadow-card backdrop-blur lg:hidden"
          >
            <ul className="flex flex-col divide-y divide-charcoal/10">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-[15px] text-charcoal/85"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-full border border-charcoal/15 py-2.5 text-center text-[13px] font-medium"
              >
                Log In
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

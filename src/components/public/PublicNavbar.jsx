import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo, Wordmark, MenuIcon, CloseIcon } from '../Icons'
import { PUBLIC_NAV } from '../../data/site/navigation'
import { useScrollLock } from '../../hooks/useReveal'

/* ------------------------------------------------------------------
   The single public navbar.

   Visual language: the landing page's floating translucent pill, unchanged in
   character. On the home page the navbar sits directly on the tall sky hero and
   stays transparent. On every inner page it becomes a soft white glass pill once
   the page is scrolled, so navigation remains legible over cream and white
   sections without inventing a second header design.

   Behaviour: active-page pill (aria-current), a proper disclosure for mobile
   navigation with Escape to close, scroll lock while open, and a close-on-route
   change so a link tap never leaves the sheet open over the new page.
------------------------------------------------------------------- */

export default function PublicNavbar({ variant = 'page' }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname, hash } = useLocation()
  useScrollLock(open)

  const homeVariant = variant === 'home'
  const locationKey = `${pathname}${hash}`

  /* Adjusting state during render is React's documented pattern for reacting to
     a changed input: the sheet closes on navigation (including browser back)
     without an extra commit or a cascading effect. */
  const [navState, setNavState] = useState({ key: locationKey, open: false })
  if (navState.key !== locationKey) {
    setNavState({ key: locationKey, open: false })
    if (open) setOpen(false)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (homeVariant) return undefined
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [homeVariant])

  const close = useCallback(() => setOpen(false), [])

  /* Home: the hero supplies the sky, so the pill is glass on sky.
     Inner pages: glass on sky at the top, near-opaque white once scrolled.

     The outer surface is deliberately borderless and shadowless: it floats on
     the hero rather than sitting inside an outlined pill. The glass tint, the
     blur and the inner controls' own borders (the link group, Log In, the
     mobile sheet) are what keep it readable as a surface. */
  const surfaceClass = homeVariant
    ? 'bg-white/10 backdrop-blur-[6px]'
    : scrolled
      ? 'bg-white/92 backdrop-blur-[14px]'
      : 'bg-white/25 backdrop-blur-[8px]'

  const isActive = (link) => link.match.some((path) => path === pathname)

  return (
    <header className={`relative z-40 ${homeVariant ? '' : 'sticky top-0'}`}>
      <div className={`shell ${homeVariant ? 'pt-5 sm:pt-7' : 'pt-4 sm:pt-5'}`}>
        <nav
          aria-label="Primary"
          className={`relative flex items-center justify-between rounded-full px-2.5 py-1.5 transition duration-500 ease-calm sm:px-4 lg:py-2 ${surfaceClass}`}
        >
          <Link to="/" className="flex items-center gap-2.5 rounded-full pl-1 pr-2 sm:gap-3">
            <Logo className="h-[30px] w-[30px] sm:h-[34px] sm:w-[34px]" />
            <Wordmark />
            <span className="sr-only">Vyuh home</span>
          </Link>

          {/* Desktop navigation. Seven destinations need a little more room than
              the original five, so the labels tighten before the pill shrinks. */}
          <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0 rounded-full border border-white/80 px-1.5 py-1.5 lg:flex xl:gap-1">
            {PUBLIC_NAV.map((link) => {
              const active = isActive(link)
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-1.5 text-[12px] transition duration-300 ease-calm xl:px-3.5 xl:text-[13px] ${
                      active
                        ? 'bg-white font-medium text-charcoal shadow-[0_6px_16px_-14px_rgba(36,39,41,0.6)]'
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
              className="hidden rounded-full border border-white/80 bg-white/40 px-5 py-2 text-[13px] font-medium text-charcoal transition duration-300 ease-calm hover:bg-white/80 sm:inline-flex"
            >
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/50 text-charcoal lg:hidden"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </nav>

        {open && (
          <div
            id="public-mobile-nav"
            className="mt-3 rounded-[26px] border border-white/80 bg-white/97 p-5 shadow-card backdrop-blur lg:hidden"
          >
            <ul className="flex flex-col divide-y divide-charcoal/10">
              {PUBLIC_NAV.map((link) => {
                const active = isActive(link)
                return (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center justify-between py-3 text-[15px] ${
                        active ? 'font-medium text-charcoal' : 'text-charcoal/80'
                      }`}
                    >
                      {link.label}
                      {active ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-charcoal" aria-hidden="true" />
                      ) : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 grid gap-2">
              <Link
                to="/admissions#enquiry"
                onClick={close}
                className="block rounded-full bg-charcoal py-2.5 text-center text-[13px] font-medium text-white"
              >
                Start an admission enquiry
              </Link>
              <Link
                to="/login"
                onClick={close}
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

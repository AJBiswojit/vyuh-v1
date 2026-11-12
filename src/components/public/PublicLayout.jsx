import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PublicNavbar from './PublicNavbar'
import PublicFooter from './PublicFooter'
import { PAGE_META } from '../../data/site/institute'

/* ------------------------------------------------------------------
   PublicLayout — one shell for all public pages.

   Responsibilities:
     · mount the single PublicNavbar + PublicFooter (no page imports its own)
     · reset scroll and focus on a route change, but honour an in-page hash
     · keep document.title and the meta description in step with the route

   Navbar placement: the home page owns its tall sky band, so it renders the
   navbar itself inside that band (`nav="none"` here) to keep the exact
   transparent-pill composition it already had. Every inner page uses the
   layout's sticky navbar. It is the same PublicNavbar component either way.
------------------------------------------------------------------- */

function useDocumentMeta(metaKey) {
  useEffect(() => {
    const meta = PAGE_META[metaKey]
    if (!meta) return
    const previousTitle = document.title
    document.title = meta.title
    const tag = document.querySelector('meta[name="description"]')
    const previousDescription = tag?.getAttribute('content') || ''
    if (tag) tag.setAttribute('content', meta.description)
    return () => {
      document.title = previousTitle
      if (tag) tag.setAttribute('content', previousDescription)
    }
  }, [metaKey])
}

export default function PublicLayout({ metaKey, navbar = 'page', footer = 'cream', nav = 'layout', children }) {
  const { pathname, hash } = useLocation()
  useDocumentMeta(metaKey)

  useEffect(() => {
    /* A hash target gets the browser's own jump; otherwise the new page starts
       at the top (React Router does not scroll for you). */
    if (hash) {
      const id = hash.replace('#', '')
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div aria-hidden="true" className="page-haze" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-[13px]"
      >
        Skip to content
      </a>
      {nav === 'layout' ? <PublicNavbar variant={navbar} /> : null}
      <main id={nav === 'layout' ? 'main-content' : undefined} className="flex-1">
        {children}
      </main>
      <PublicFooter variant={footer} />
    </div>
  )
}

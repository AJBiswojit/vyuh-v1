import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'
import { useScrollLock } from '../hooks/useReveal'

/* Lightweight, accessible media dialog used by the hero frame and the
   "Watch Video" control. Focus is moved into the dialog and restored on close. */
export default function VideoModal({ open, onClose }) {
  const closeRef = useRef(null)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-video-title"
    >
      <button
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-charcoal/45 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-[860px] overflow-hidden rounded-[26px] bg-white shadow-float">
        <div className="flex items-center justify-between gap-4 border-b border-charcoal/10 px-5 py-4">
          <div>
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              Platform Introduction
            </p>
            <h2 id="intro-video-title" className="mt-1 text-[17px] font-medium">
              How Vyuh builds exam-ready confidence
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 text-charcoal transition hover:bg-charcoal/5"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="grid gap-6 bg-cream/50 p-6 sm:grid-cols-[1.1fr_1fr] sm:p-8">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-5">
            <p className="font-serif text-[22px] leading-snug">A guided walkthrough</p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-charcoal/70">
              <li>Structured course flow for every chapter</li>
              <li>Topic-wise tests with instant performance analysis</li>
              <li>Curated notes, PYQs, and revision material</li>
              <li>Doubt support and mentor guidance</li>
            </ul>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-charcoal/10 bg-white p-5">
            <p className="text-[13.5px] text-charcoal/70">
              Our team walks you through the platform live during onboarding. Request a session and
              we will schedule a walkthrough at your convenience.
            </p>
            <a href="mailto:office@vyuhacademy.edu.in?subject=Platform%20walkthrough" className="ghost-btn self-start">
              Request a walkthrough
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

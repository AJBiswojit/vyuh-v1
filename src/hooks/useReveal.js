import { useEffect, useRef } from 'react'

/* Gentle, one-shot fade-up reveal driven by IntersectionObserver.
   `key` re-arms the observer when a routed page swaps its content in place —
   without it, links rendered by a newly mounted page were never observed and
   stayed invisible. Omit it for a one-shot page such as the home page. */
export default function useReveal(key) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-in')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    const items = node.querySelectorAll('.reveal')
    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [key])

  return ref
}

/* Lock page scroll while a modal is open. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}

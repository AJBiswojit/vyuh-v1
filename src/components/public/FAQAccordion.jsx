import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/* ------------------------------------------------------------------
   FAQAccordion — one accessible disclosure list.

   Uses a button + region pair (not a <details> element) so the open/close
   animation is controllable and the aria-expanded state is explicit. The first
   item can start open; a single item can be open at a time.
------------------------------------------------------------------- */

export default function FAQAccordion({ items, defaultOpen = null, allowMultiple = false, className = '' }) {
  const [openIds, setOpenIds] = useState(() => (defaultOpen ? [defaultOpen] : []))
  const baseId = useId()

  const toggle = (id) => {
    setOpenIds((current) => {
      const isOpen = current.includes(id)
      if (isOpen) return current.filter((entry) => entry !== id)
      return allowMultiple ? [...current, id] : [id]
    })
  }

  return (
    <div className={`divide-y divide-charcoal/10 border-y border-charcoal/10 ${className}`}>
      {items.map((item) => {
        const open = openIds.includes(item.id)
        const panelId = `${baseId}-${item.id}-panel`
        const buttonId = `${baseId}-${item.id}-button`
        return (
          <div key={item.id} className="py-1">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-start justify-between gap-5 py-4 text-left transition duration-300 ease-calm hover:text-charcoal/70"
              >
                <span className="text-[15px] font-medium leading-[1.5] tracking-[-0.01em] text-charcoal sm:text-[15.5px]">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-charcoal/15 transition duration-300 ease-calm ${
                    open ? 'rotate-180 bg-charcoal text-white' : 'text-charcoal/60'
                  }`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="pb-5 pr-10 text-[13.5px] leading-[1.72] text-charcoal/72"
            >
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from './Icons'
import { TESTIMONIALS } from '../content'

const VISIBLE = 3

export default function Testimonials() {
  const [offset, setOffset] = useState(0)

  const move = (direction) =>
    setOffset((current) => (current + direction + TESTIMONIALS.length) % TESTIMONIALS.length)

  const ordered = TESTIMONIALS.map(
    (_, index) => TESTIMONIALS[(index + offset) % TESTIMONIALS.length],
  )

  return (
    <section id="testimonials" className="wash-sky pb-12 pt-7 sm:pb-14 lg:pb-14 lg:pt-10">
      <div className="shell">
        <div className="reveal mx-auto max-w-[400px] text-center">
          <h2 className="text-[26px] leading-[1.24] tracking-[-0.028em] sm:text-[31px] lg:text-[34px]">
            Find out why 25k+
            <br />
            learners <span className="serif-word">trust</span> Vyuh
          </h2>
        </div>

        <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-4">
          {ordered.slice(0, VISIBLE).map((item, index) => (
            <li
              key={item.id}
              className={`reveal flex flex-col rounded-[18px] bg-white px-6 pb-6 pt-6 lg:min-h-[248px] shadow-[0_12px_32px_-30px_rgba(36,39,41,0.55)] transition duration-700 ease-calm hover:-translate-y-1 ${
                index === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <blockquote className="text-[14px] leading-[1.72] text-charcoal/80 sm:text-[14.5px]">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-2.5 pt-6 lg:pt-8">
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt=""
                    width="120"
                    height="120"
                    loading="lazy"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-[11px] font-medium text-charcoal/70"
                  >
                    {item.initials}
                  </span>
                )}
                <div>
                  <p className="text-[13px] font-medium leading-tight">{item.name}</p>
                  <p className="mt-1 text-[11px] italic text-charcoal/55">{item.role}</p>
                </div>
              </figcaption>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Show previous testimonial"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-charcoal/20 text-charcoal/70 transition duration-500 ease-calm hover:border-charcoal/40 hover:text-charcoal"
          >
            <ChevronLeft className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Show next testimonial"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-charcoal/20 text-charcoal/70 transition duration-500 ease-calm hover:border-charcoal/40 hover:text-charcoal"
          >
            <ChevronRight className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </section>
  )
}

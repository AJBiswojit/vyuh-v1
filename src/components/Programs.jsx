import { Link } from 'react-router-dom'
import { ArrowUpRight } from './Icons'
import { PROGRAMS } from '../content'

/* Section: Preparation that fits your goals — JEE / NEET / Academic. */
export default function Programs() {
  return (
    <section id="programs" className="bg-white pb-12 pt-6 sm:pb-14 lg:pb-16 lg:pt-8">
      <div className="shell">
        <div className="reveal mx-auto max-w-[560px] text-center">
          <h2 className="text-[27px] leading-[1.2] tracking-[-0.028em] sm:text-[33px] lg:text-[38px]">
            One platform. <span className="serif-word">Different</span> ambitions.
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-[14px] leading-[1.62] text-charcoal/70 sm:text-[15.5px]">
            Whether you’re preparing for a competitive entrance examination or strengthening
            academic fundamentals, Vyuh brings your learning journey together.
          </p>
        </div>

        <div className="mt-9 grid gap-5 sm:mt-11 sm:grid-cols-3 sm:gap-5">
          {PROGRAMS.map((program, index) => (
            <article
              key={program.id}
              className="reveal group flex flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_14px_38px_-32px_rgba(36,39,41,0.55)] transition duration-700 ease-calm hover:-translate-y-1 hover:shadow-[0_24px_56px_-38px_rgba(36,39,41,0.5)]"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div className="relative overflow-hidden bg-gradient-to-b from-[#CFE6F5] to-[#EFEBDD]">
                <img
                  src={program.image}
                  alt={program.imageAlt}
                  width="640"
                  height="349"
                  loading="lazy"
                  className="h-[168px] w-full object-cover object-center transition duration-700 ease-calm group-hover:scale-[1.02] sm:h-[196px] lg:h-[204px]"
                />
              </div>

              <div className="flex flex-1 flex-col px-5 pb-5 pt-5 lg:px-7 lg:pb-7 lg:pt-6">
                <span className="serif-word text-[13px] leading-none text-charcoal/45">
                  {program.number}
                </span>
                <h3 className="mt-2 font-serif text-[24px] leading-[1.2] tracking-[-0.015em] sm:text-[28px] lg:text-[31px]">
                  {program.title}
                </h3>
                <p className="mt-3 max-w-[330px] text-[14px] leading-[1.66] text-charcoal/70 lg:text-[15px]">
                  {program.description}
                </p>
                <div className="mt-auto flex justify-end pt-8">
                  <Link
                    to={program.to}
                    aria-label={`Explore ${program.title}`}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/85"
                  >
                    <ArrowUpRight />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

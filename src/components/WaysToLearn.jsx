import { Link } from 'react-router-dom'
import { ArrowUpRight } from './Icons'
import { LEARNING_CARDS } from '../content'

export default function WaysToLearn() {
  return (
    <section id="features" className="wash-sky pb-12 pt-9 sm:pb-14 lg:pb-16 lg:pt-11">
      <div className="shell">
        <div className="reveal mx-auto max-w-[560px] text-center">
          <h2 className="text-[27px] leading-[1.2] tracking-[-0.028em] sm:text-[34px] lg:text-[40px]">
            <span className="serif-word">More</span> ways to learn
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.62] text-charcoal/70 sm:text-[16px]">
            A complete learning ecosystem with everything you need to study, practice, analyze, and
            improve in one place.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
          {LEARNING_CARDS.map((card, index) => (
            <article
              key={card.id}
              className={`reveal group flex flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_14px_38px_-32px_rgba(36,39,41,0.55)] transition duration-700 ease-calm hover:-translate-y-1 hover:shadow-[0_24px_56px_-38px_rgba(36,39,41,0.5)] ${
                index === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
              style={{ transitionDelay: `${index * 40}ms` }}
            >
              <div className="relative overflow-hidden bg-gradient-to-b from-[#CFE6F5] to-[#EFEBDD]">
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  width="640"
                  height="349"
                  loading="lazy"
                  className="h-[168px] w-full object-cover object-center transition duration-700 ease-calm group-hover:scale-[1.02] sm:h-[196px] lg:h-[204px]"
                />
              </div>

              <div className="flex flex-1 flex-col px-5 pb-5 pt-5 lg:px-7 lg:pb-7 lg:pt-6">
                <h3 className="font-serif text-[24px] leading-[1.2] tracking-[-0.015em] sm:text-[28px] lg:text-[31px]">
                  {card.title}
                </h3>
                <p className="mt-3 max-w-[330px] text-[14px] leading-[1.66] text-charcoal/70 lg:text-[15px]">
                  {card.description}
                </p>
                <div className="mt-auto flex justify-end pt-8">
                  <Link
                    to={card.to}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/85"
                    aria-label={`Explore ${card.title}`}
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

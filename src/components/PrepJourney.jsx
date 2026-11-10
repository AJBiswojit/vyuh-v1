import { JOURNEY_STEPS } from '../content'

/* Section: Your Preparation Journey — three connected editorial stages. */
export default function PrepJourney() {
  return (
    <section id="journey" className="wash-sky pb-12 pt-6 sm:pb-14 lg:pb-16 lg:pt-8">
      <div className="shell">
        <div className="reveal mx-auto max-w-[560px] text-center">
          <p className="eyebrow justify-center">
            <span className="eyebrow-dot" />
            Your Preparation Journey
          </p>
          <h2 className="mt-3.5 text-[27px] leading-[1.2] tracking-[-0.028em] sm:text-[33px] lg:text-[38px]">
            Every step brings you <span className="serif-word">closer</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[14px] leading-[1.62] text-charcoal/70 sm:text-[15.5px]">
            From understanding concepts to mastering exams, Vyuh gives your preparation a clear
            direction.
          </p>
        </div>

        <ol className="relative mt-9 grid gap-5 sm:mt-11 sm:grid-cols-3 sm:gap-5">
          {JOURNEY_STEPS.map((step, index) => (
            <li
              key={step.id}
              className="reveal relative flex flex-col"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="overflow-hidden rounded-[20px] bg-gradient-to-b from-[#D3E8F5] to-[#F1EBDD]">
                <img
                  src={step.image}
                  alt={step.imageAlt}
                  width="640"
                  height="349"
                  loading="lazy"
                  className="h-[152px] w-full object-cover object-center sm:h-[178px]"
                />
              </div>

              <div className="relative -mt-5 ml-4 mr-4 flex flex-col rounded-[16px] bg-white px-5 pb-5 pt-4 shadow-[0_14px_36px_-30px_rgba(36,39,41,0.55)] transition duration-700 ease-calm hover:-translate-y-1">
                <span className="serif-word text-[15px] leading-none text-charcoal/45">
                  {step.number}
                </span>
                <h3 className="mt-1.5 font-serif text-[21px] leading-tight tracking-[-0.015em] sm:text-[23px]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.62] text-charcoal/70">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

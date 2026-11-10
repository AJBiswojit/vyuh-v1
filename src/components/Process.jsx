import { PROCESS_STEPS } from '../content'

export default function Process() {
  return (
    <section id="results" className="wash-sky pb-12 pt-5 sm:pb-14 lg:pb-16 lg:pt-7">
      <div className="shell">
        <div className="reveal mx-auto max-w-[560px] text-center">
          <h2 className="text-[26px] leading-[1.2] tracking-[-0.028em] sm:text-[32px] lg:text-[36px]">
            Reduce effort, maximize results
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[14px] leading-[1.6] text-charcoal/70 sm:text-[15px]">
            Smart tools and focused learning to help you prepare better, track progress, and achieve
            your goals faster.
          </p>
        </div>

        <ol className="mt-9 grid gap-4 sm:grid-cols-3 lg:mt-11 lg:gap-5">
          {PROCESS_STEPS.map((step, index) => (
            <li
              key={step.number}
              className="reveal flex flex-col justify-between gap-12 rounded-[20px] bg-gradient-to-b from-[#BFE0F5] via-[#D9E9F1] to-[#F4EFDC] px-5 pb-5 pt-5 transition  duration-700 ease-calm hover:-translate-y-1 hover:shadow-[0_22px_50px_-38px_rgba(36,39,41,0.5)] sm:px-4.5"
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <span className="serif-word block text-[38px] leading-none text-white/95 sm:text-[52px]">
                {step.number}
              </span>
              <div>
                <h3 className="text-[16px] font-medium tracking-[-0.01em] sm:text-[18px]">{step.title}</h3>
                <p className="mt-2.5 max-w-[230px] text-[13px] leading-[1.58] sm:text-[14px] text-charcoal/70">
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

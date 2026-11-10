import { PlayTriangle } from './Icons'
import { ABOUT_STATS } from '../content'

export default function AboutSection({ onOpenVideo }) {
  return (
    <section id="about" className="wash-cream relative z-10 pb-12 pt-2 sm:pb-14 lg:pb-16 lg:pt-4">
      <div className="shell">
        <div className="grid items-center gap-11 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1fr)] lg:gap-20">
          {/* -------- left: portrait composition -------- */}
          <div className="reveal relative">
            <div className="relative mx-auto max-w-[368px]">
              <button
                type="button"
                onClick={onOpenVideo}
                className="absolute -top-5 left-1 z-20 inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 text-[13px] font-medium text-charcoal shadow-[0_10px_22px_-18px_rgba(36,39,41,0.65)] transition duration-500 ease-calm hover:-translate-y-[2px] sm:-left-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky/70 text-charcoal">
                  <PlayTriangle />
                </span>
                Watch Video
              </button>

              <div className="relative flex items-start justify-center overflow-hidden rounded-[26px] bg-white pb-14 pt-10 sm:pb-16 lg:pb-4">
                <img
                  src="/assets/about-mentor.webp"
                  alt="Vyuh academic mentor holding study material"
                  width="326"
                  height="713"
                  loading="lazy"
                  className="block h-[392px] w-auto object-contain object-top sm:h-[452px] lg:h-[492px]"
                />
              </div>

              <div className="absolute -bottom-4 left-0 right-0 z-20 sm:-bottom-3 flex items-start gap-2.5 rounded-[16px] border border-charcoal/8 bg-white px-3.5 py-3 shadow-[0_16px_34px_-26px_rgba(36,39,41,0.6)] sm:-left-6 sm:right-[18%] sm:max-w-[288px]">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-[10.5px] font-medium text-charcoal/70">
                  VT
                </span>
                <div>
                  <p className="text-[13px] font-medium leading-tight">Vyuh Team</p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-charcoal/50">
                    Academic Mentor
                  </p>
                  <p className="mt-1.5 text-[12px] leading-[1.45] text-charcoal/70">
                    “Strategy, practice, and smart analysis—all in one place with Vyuh.”
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -------- right: editorial copy -------- */}
          <div className="reveal pt-5 lg:pt-0">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              About Vyuh
            </p>
            <h2 className="mt-3.5 text-[28px] leading-[1.17] tracking-[-0.028em] sm:text-[36px] lg:text-[44px] lg:leading-[1.14]">
              <span className="serif-word">Plan</span> your preparation
              <br />
              build your success
            </h2>
            <p className="mt-4 max-w-[484px] text-[15px] leading-[1.72] text-charcoal/75 sm:text-[17px]">
              Vyuh brings together structured learning, smart practice, and performance insights to
              help students prepare for competitive exams like JEE, NEET, and beyond. With focused
              content, powerful analytics, and AI-driven support, Vyuh helps you move closer to your
              goals with clarity and confidence.
            </p>

            <dl className="mt-9 grid grid-cols-3 gap-2 border-t border-charcoal/15 pt-6 sm:gap-5">
              {ABOUT_STATS.map((stat) => (
                <div key={stat.label} className="border-r border-charcoal/15 pr-2 last:border-0 last:pr-0">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="serif-word block whitespace-nowrap text-[24px] leading-none sm:text-[30px]">
                      {stat.value}
                    </span>
                    <span className="mt-2.5 block text-[9px] font-medium uppercase leading-[1.35] tracking-[0.13em] text-charcoal/55 sm:text-[10px]">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

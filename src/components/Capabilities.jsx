import {
  ConceptIcon,
  DoubtIcon,
  TestSeriesIcon,
  AnalyticsIcon,
  MaterialsIcon,
} from './Icons'
import { CAPABILITIES } from '../content'

const ICONS = {
  concept: ConceptIcon,
  doubt: DoubtIcon,
  tests: TestSeriesIcon,
  analytics: AnalyticsIcon,
  materials: MaterialsIcon,
}

export default function Capabilities() {
  return (
    <section aria-label="Platform capabilities" className="wash-sky pb-12 pt-4 sm:pb-14 lg:pb-16 lg:pt-5">
      <div className="shell">
        <ul className="reveal grid grid-cols-2 gap-x-3 gap-y-6 pt-7 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-4">
          {CAPABILITIES.map((item, index) => {
            const Icon = ICONS[item.icon]
            return (
              <li
                key={item.id}
                className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-[16px] bg-white px-3 pb-5 pt-10 text-center transition duration-700 ease-calm hover:-translate-y-1 ${
                  index === 4 ? 'col-span-2 sm:col-span-1' : ''
                }`}
              >
                <span className="absolute -top-[22px] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#F1F7FB] text-charcoal/75">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[12.5px] leading-[1.4] text-charcoal/80 sm:text-[13.5px]">{item.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

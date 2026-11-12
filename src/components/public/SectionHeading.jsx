/* ------------------------------------------------------------------
   SectionHeading — the one heading pattern for every public section.

   Keeps the editorial rhythm: optional eyebrow, a serif-word emphasis inside the
   heading, an optional lede and an optional trailing action. Alignment is a
   prop so the same component can open a centred band or a two-column section
   without a second implementation.
------------------------------------------------------------------- */

export default function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  size = 'md',
  action = null,
  className = '',
  as: Tag = 'h2',
}) {
  const centred = align === 'center'
  const titleSizes =
    size === 'lg'
      ? 'text-[28px] leading-[1.17] tracking-[-0.03em] sm:text-[36px] lg:text-[42px]'
      : size === 'sm'
        ? 'text-[22px] leading-[1.2] tracking-[-0.022em] sm:text-[25px]'
        : 'text-[25px] leading-[1.18] tracking-[-0.028em] sm:text-[31px] lg:text-[36px]'

  return (
    <div
      className={`${centred ? 'mx-auto max-w-[620px] text-center' : ''} ${
        action ? 'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between' : ''
      } ${className}`}
    >
      <div className={centred ? '' : 'max-w-[640px]'}>
        {eyebrow ? (
          <p className={`eyebrow ${centred ? 'justify-center' : ''}`}>
            <span className="eyebrow-dot" />
            {eyebrow}
          </p>
        ) : null}
        <Tag className={`${eyebrow ? 'mt-3' : ''} ${titleSizes}`}>{title}</Tag>
        {lede ? (
          <p
            className={`mt-3.5 text-[14.5px] leading-[1.7] text-charcoal/70 sm:text-[15.5px] ${
              centred ? 'mx-auto max-w-[560px]' : 'max-w-[600px]'
            }`}
          >
            {lede}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

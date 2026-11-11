import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/* Chart primitives.

   Colour is semantic before it is decorative:

     deep blue  #23536e  primary series (score, attendance, share)
     sky        #6aaed2  comparison / secondary series
     sky light  #aed9f0  reference series, filled areas
     cream      #b9a97a  time, effort, neutral magnitude
     green      #5d9153  correct / healthy
     amber      #c0a047  caution
     red        #bd6a6a  incorrect / at risk

   Series are handed out in that order, so no two adjacent charts repeat a
   colour and every workspace draws from the same set. */

export const CHART_COLORS = ['#23536e', '#6aaed2', '#b9a97a', '#5d9153', '#aed9f0', '#bd6a6a', '#4a8fb5', '#c0a047']

export const CHART_TONE = {
  primary: '#23536e',
  sky: '#6aaed2',
  skyLight: '#aed9f0',
  cream: '#b9a97a',
  good: '#5d9153',
  warn: '#c0a047',
  bad: '#bd6a6a',
  track: '#e8f1f6',
}

const axisStyle = {
  fontSize: 10.5,
  fill: 'rgba(36,53,64,0.6)',
  fontFamily: 'Switzer, system-ui, sans-serif',
}

const GRID = 'rgba(36,53,64,0.09)'

export function ChartFrame({ title, subtitle, height = 220, children, action, legend, tone = 'default' }) {
  return (
    <div className={`${tone === 'sky' ? 'surface-sky' : tone === 'cream' ? 'surface-cream' : 'surface-flat'} p-4 sm:p-5`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-[13px] font-medium text-ink">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      )}
      <div style={{ width: '100%', height }}>
        {children}
      </div>
      {legend ? <div className="mt-2 flex flex-wrap gap-3">{legend}</div> : null}
    </div>
  )
}

function TooltipBox({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[10px] border border-[var(--sky-200)] bg-white px-2.5 py-2 shadow-[var(--shadow-md)]">
      <p className="text-[10.5px] uppercase tracking-wide text-soft">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} className="mt-0.5 text-[12px] font-medium text-ink">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(entry.value % 1 === 0 ? 0 : 1) : entry.value}
          {unit}
        </p>
      ))}
    </div>
  )
}

export function TrendArea({
  data,
  xKey = 'label',
  yKey = 'percentage',
  name = 'Score %',
  height = 200,
  domain = [0, 100],
  color = CHART_TONE.primary,
  gradientId,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gradientId || `area-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.26} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip content={<TooltipBox />} />
        <Area
          type="monotone"
          dataKey={yKey}
          name={name}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${gradientId || `area-${yKey}`})`}
          dot={{ r: 2.6, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          isAnimationActive
          animationDuration={520}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MultiLine({ data, xKey = 'label', series = [], height = 220, domain = [0, 100] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(36,53,64,0.7)' }} iconType="circle" iconSize={6} />
        {series.map((entry, index) => (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.name}
            stroke={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={1.8}
            dot={{ r: 2.4 }}
            connectNulls
            animationDuration={500}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ComparisonBars({ data, xKey = 'name', series = [], height = 220, layout = 'vertical', unit = '' }) {
  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} width={82} />
          <Tooltip content={<TooltipBox unit={unit} />} />
          {series.map((entry, index) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.name}
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
              radius={[0, 4, 4, 0]}
              barSize={12}
              animationDuration={480}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip content={<TooltipBox unit={unit} />} />
        {series.map((entry, index) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            name={entry.name}
            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
            barSize={18}
            animationDuration={480}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({ data, height = 180, innerRadius = 48, outerRadius = 70, centerLabel, centerValue }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1.5}
            stroke="none"
            animationDuration={480}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-figure text-[22px] text-ink">{centerValue}</span>
          {centerLabel ? <span className="mt-0.5 text-[10px] uppercase tracking-wide text-soft">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export function TopicRadar({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(36,53,64,0.14)" />
        <PolarAngleAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} />
        <Radar name="Accuracy %" dataKey="value" stroke={CHART_TONE.primary} strokeWidth={1.6} fill={CHART_TONE.skyLight} fillOpacity={0.7} animationDuration={520} />
        <Tooltip content={<TooltipBox unit="%" />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ data, dataKey = 'value', color = CHART_TONE.primary, height = 34 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.4} fill={color} fillOpacity={0.1} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

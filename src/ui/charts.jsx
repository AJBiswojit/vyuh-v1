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

/* Chart primitives. Colours come only from the locked palette plus neutral
   charcoal shades, so every workspace looks consistent. */

export const CHART_COLORS = ['#242729', '#aed9f0', '#8a7a4e', '#6aaed2', '#b9a97a', '#7f8386']

const axisStyle = {
  fontSize: 10.5,
  fill: 'rgba(36,39,41,0.55)',
  fontFamily: 'Switzer, system-ui, sans-serif',
}

export function ChartFrame({ title, subtitle, height = 220, children, action, legend }) {
  return (
    <div className="surface-flat p-4 sm:p-5">
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
    <div className="rounded-[10px] border border-[var(--line)] bg-white px-2.5 py-2 shadow-[var(--shadow-md)]">
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

export function TrendArea({ data, xKey = 'label', yKey = 'percentage', name = 'Score %', height = 200, domain = [0, 100], color = '#242729' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={`area-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(36,39,41,0.07)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip content={<TooltipBox />} />
        <Area
          type="monotone"
          dataKey={yKey}
          name={name}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#area-${yKey})`}
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
        <CartesianGrid stroke="rgba(36,39,41,0.07)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={axisStyle} axisLine={false} tickLine={false} width={38} />
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(36,39,41,0.7)' }} iconType="circle" iconSize={6} />
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
          <CartesianGrid stroke="rgba(36,39,41,0.07)" horizontal={false} />
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
        <CartesianGrid stroke="rgba(36,39,41,0.07)" vertical={false} />
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
        <PolarGrid stroke="rgba(36,39,41,0.12)" />
        <PolarAngleAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} />
        <Radar name="Accuracy %" dataKey="value" stroke="#242729" fill="#aed9f0" fillOpacity={0.55} animationDuration={520} />
        <Tooltip content={<TooltipBox unit="%" />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function Sparkline({ data, dataKey = 'value', color = '#242729', height = 34 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.4} fill={color} fillOpacity={0.1} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

import { motion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

function EmptyChart({ label = 'No data yet' }) {
  return (
    <div className="grid h-[180px] place-items-center rounded-xl border border-dashed border-ink/10 bg-beige/30 text-[13px] text-warm">
      {label}
    </div>
  )
}

export function RevenueChart({ data = [] }) {
  const series = data?.length ? data : []
  if (!series.length) return <EmptyChart label="No revenue recorded in this range" />
  const w = 640
  const h = 220
  const pad = { t: 16, r: 12, b: 30, l: 44 }
  const max = Math.max(...series.map((d) => d.revenue)) * 1.12
  const min = 0
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / (series.length - 1)
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b)

  const line = series.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.revenue)}`).join(' ')
  const area = `${line} L${x(series.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue over the last 7 days">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C0522F" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#C0522F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="#E7DCC9" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8C8375">
              ${t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}
        <motion.path
          d={area}
          fill="url(#revFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#C0522F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease }}
        />
        {series.map((d, i) => (
          <g key={d.label}>
            <motion.circle
              cx={x(i)}
              cy={y(d.revenue)}
              r="4"
              fill="#FBF7F0"
              stroke="#C0522F"
              strokeWidth="2.2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
            />
            <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="10.5" fill="#8C8375">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function OrdersBarChart({ data = [] }) {
  const series = data?.length ? data : []
  if (!series.length) return <EmptyChart label="No orders in this range" />
  const w = 640
  const h = 220
  const pad = { t: 16, r: 12, b: 30, l: 40 }
  const max = Math.max(...series.map((d) => d.orders)) * 1.15
  const bw = (w - pad.l - pad.r) / series.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Orders per day this week">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + (1 - f) * (h - pad.t - pad.b)}
            y2={pad.t + (1 - f) * (h - pad.t - pad.b)}
            stroke="#E7DCC9"
          />
          <text x={pad.l - 8} y={pad.t + (1 - f) * (h - pad.t - pad.b) + 4} textAnchor="end" fontSize="10" fill="#8C8375">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      {series.map((d, i) => {
        const bh = (d.orders / max) * (h - pad.t - pad.b)
        const bx = pad.l + i * bw + bw * 0.2
        return (
          <g key={d.label}>
            <motion.rect
              x={bx}
              width={bw * 0.6}
              rx="6"
              fill={i % 5 === 4 ? '#C0522F' : '#17140F'}
              initial={{ height: 0, y: h - pad.b }}
              animate={{ height: bh, y: h - pad.b - bh }}
              transition={{ duration: 0.7, delay: i * 0.07, ease }}
            />
            <text x={bx + bw * 0.3} y={h - 8} textAnchor="middle" fontSize="10.5" fill="#8C8375">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function DonutChart({ data = [], size = 190 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 70
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label="Orders by category donut chart">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#F2EADB" strokeWidth="24" />
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * c
          const el = (
            <motion.circle
              key={d.name}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="24"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            />
          )
          offset += dash
          return el
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="22" fontWeight="600" fill="#17140F" fontFamily="Fraunces Variable, serif">
          {total}%
        </text>
        <text x="90" y="106" textAnchor="middle" fontSize="10" fill="#8C8375">
          this week
        </text>
      </svg>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="text-ink-600">{d.name}</span>
            <span className="ml-auto font-semibold text-ink tabular-nums">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PopularDishes({ data = [] }) {
  if (!data?.length) return <EmptyChart label="No dishes sold yet" />
  return (
    <ul className="space-y-4">
      {data.map((d, i) => (
        <li key={d.name}>
          <div className="mb-1.5 flex items-center justify-between text-[13.5px]">
            <span className="font-medium text-ink">
              <span className="mr-2 text-warm tabular-nums">{i + 1}.</span>
              {d.name}
            </span>
            <span className="text-warm tabular-nums">{d.orders} orders</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-beige">
            <motion.div
              className="h-full rounded-full"
              style={{ background: i === 0 ? '#C0522F' : i === 1 ? '#5F6F45' : '#17140F' }}
              initial={{ width: 0 }}
              whileInView={{ width: `${d.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.08, ease }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

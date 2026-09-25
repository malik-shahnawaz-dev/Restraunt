import { Star } from 'lucide-react'

export function Badge({ children, tone = 'neutral', size = 'sm', className = '' }) {
  const tones = {
    neutral: 'bg-beige text-ink-600',
    info: 'bg-sand text-ink-600',
    dark: 'bg-ink text-cream',
    clay: 'bg-clay-soft text-clay-dark',
    olive: 'bg-olive-soft text-olive-dark',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    outline: 'border border-ink/15 text-ink-600 bg-transparent',
  }
  const sizes = {
    xs: 'text-[10.5px] px-2 py-0.5 gap-1',
    sm: 'text-[11.5px] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-1.5',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-[0.04em] uppercase ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  )
}

export function Rating({ value = 5, count, size = 14, className = '', showValue = true }) {
  const full = Math.round(value)
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" aria-label={`Rated ${value} out of 5 stars`} role="img">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < full ? 'fill-clay text-clay' : 'fill-sand text-sand'}
            strokeWidth={0}
          />
        ))}
      </div>
      {showValue && <span className="text-[13px] font-semibold text-ink">{value.toFixed(1)}</span>}
      {count != null && <span className="text-[12.5px] text-warm">({count})</span>}
    </div>
  )
}

export function DietTags({ tags = [], className = '' }) {
  const map = {
    vegetarian: { label: 'Vegetarian', cls: 'bg-olive-soft text-olive-dark' },
    vegan: { label: 'Vegan', cls: 'bg-olive-soft text-olive-dark' },
    glutenFree: { label: 'Gluten Free', cls: 'bg-beige text-ink-600' },
    spicy: { label: 'Spicy', cls: 'bg-clay-soft text-clay-dark' },
    signature: { label: 'Signature', cls: 'bg-ink text-cream' },
  }
  if (!tags?.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {tags.map((t) =>
        map[t] ? (
          <span
            key={t}
            className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold tracking-[0.05em] uppercase ${map[t].cls}`}
          >
            {map[t].label}
          </span>
        ) : null,
      )}
    </div>
  )
}

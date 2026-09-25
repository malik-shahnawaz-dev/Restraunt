import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'

export function Reveal({ children, delay = 0, y = 28, className = '', once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-70px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  light = false,
  className = '',
}) {
  const alignCls = align === 'left' ? 'items-start text-left' : 'items-center text-center'
  return (
    <Reveal className={`flex flex-col gap-4 ${alignCls} ${className}`}>
      {eyebrow && (
        <span
          className={`text-[11.5px] font-semibold tracking-[0.22em] uppercase ${
            light ? 'text-clay/90' : 'text-clay'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] font-medium tracking-[-0.02em] ${
          light ? 'text-cream' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`max-w-xl text-[15.5px] leading-relaxed ${light ? 'text-cream/65' : 'text-warm'}`}>
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  ariaLabel = 'Quantity',
}) {
  const dims = {
    sm: 'h-8 min-w-8 text-[13px]',
    md: 'h-10 min-w-10 text-sm',
    lg: 'h-12 min-w-12 text-[15px]',
  }
  const btn =
    'grid place-items-center cursor-pointer transition-colors hover:bg-ink/[0.06] disabled:opacity-30 disabled:cursor-not-allowed'
  return (
    <div
      className={`inline-flex items-center rounded-full border border-ink/12 bg-white ${dims[size]}`}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={`${btn} h-full w-9 rounded-l-full`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus size={size === 'sm' ? 13 : 15} />
      </button>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: value > min ? 4 : -4, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="min-w-7 text-center font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </motion.span>
      <button
        type="button"
        className={`${btn} h-full w-9 rounded-r-full`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={size === 'sm' ? 13 : 15} />
      </button>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      {Icon && (
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-beige text-warm">
          <Icon size={26} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display text-xl font-medium text-ink">{title}</h3>
      {message && <p className="mt-2 max-w-sm text-[14.5px] leading-relaxed text-warm">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-ink/5 bg-white">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function Spinner({ size = 20, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-ink/15 border-t-clay ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}

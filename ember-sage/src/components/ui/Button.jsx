import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-clay text-white hover:bg-clay-dark active:bg-clay-dark shadow-soft hover:shadow-lift disabled:bg-clay/40',
  dark: 'bg-ink text-cream hover:bg-ink-700 active:bg-ink-800 disabled:bg-ink/40',
  light: 'bg-cream text-ink hover:bg-white disabled:bg-cream/50',
  outline:
    'border border-ink/15 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/[0.03] disabled:border-ink/10 disabled:text-warm',
  'outline-light':
    'border border-cream/30 bg-transparent text-cream hover:border-cream/70 hover:bg-cream/10 disabled:opacity-40',
  ghost: 'bg-transparent text-ink hover:bg-ink/[0.06] disabled:text-warm',
  'ghost-light': 'bg-transparent text-cream hover:bg-cream/10 disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40',
}

const SIZES = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-4 text-[13px] gap-2',
  md: 'h-11 px-6 text-sm gap-2',
  lg: 'h-12 px-7 text-[15px] gap-2.5',
  xl: 'h-14 px-9 text-base gap-2.5',
  icon: 'h-11 w-11 p-0 gap-0',
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-medium tracking-[0.01em] transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={size === 'sm' || size === 'xs' ? 14 : 17} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export default Button

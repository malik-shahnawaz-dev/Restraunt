import { useId } from 'react'
import { AlertCircle } from 'lucide-react'

const BASE =
  'w-full rounded-xl border bg-white px-4 text-[15px] text-ink placeholder:text-warm-light transition-all duration-200 outline-none hover:border-warm-light focus:border-clay focus:ring-2 focus:ring-clay/15 disabled:bg-beige disabled:text-warm'

const HEIGHTS = {
  md: 'h-12',
  sm: 'h-10 text-sm px-3.5',
}

export function Field({ label, error, hint, required, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-600">
          {label}
          {required && <span className="ml-0.5 text-clay" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-danger" role="alert">
          <AlertCircle size={13} className="shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-warm">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ label, error, hint, required, className = '', id, height = 'md', ...rest }) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={inputId}>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className={`${BASE} ${HEIGHTS[height]} ${error ? 'border-danger/60 focus:border-danger focus:ring-danger/15' : 'border-ink/10'}`}
        {...rest}
      />
      {error && (
        <span id={`${inputId}-err`} className="sr-only">
          {error}
        </span>
      )}
    </Field>
  )
}

export function Textarea({ label, error, hint, required, className = '', rows = 4, ...rest }) {
  const autoId = useId()
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={autoId}>
      <textarea
        id={autoId}
        rows={rows}
        className={`${BASE} resize-none py-3 leading-relaxed ${error ? 'border-danger/60' : 'border-ink/10'}`}
        {...rest}
      />
    </Field>
  )
}

export function Select({ label, error, hint, required, className = '', children, ...rest }) {
  const autoId = useId()
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={autoId}>
      <div className="relative">
        <select
          id={autoId}
          className={`${BASE} h-12 appearance-none border-ink/10 pr-10 ${error ? 'border-danger/60' : ''}`}
          {...rest}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-warm"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  )
}

export function Checkbox({ label, id, className = '', ...rest }) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-ink-600 select-none ${className}`}
    >
      <input
        id={inputId}
        type="checkbox"
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden
        className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-ink/25 bg-white transition-all duration-200 peer-checked:border-clay peer-checked:bg-clay peer-focus-visible:ring-2 peer-focus-visible:ring-clay/30 peer-checked:[&_svg]:opacity-100"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white opacity-0 transition-opacity">
          <path d="M2.5 6.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  )
}

export function Radio({ label, name, value, checked, onChange, description, className = '' }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${
        checked ? 'border-clay bg-clay-soft/50 shadow-soft' : 'border-ink/10 bg-white hover:border-warm-light'
      } ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-clay/30 ${
          checked ? 'border-clay' : 'border-ink/25'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full bg-clay transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-warm">{description}</span>}
      </span>
    </label>
  )
}

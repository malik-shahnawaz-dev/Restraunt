import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function PageHeader({ eyebrow, title, subtitle, children, compact = false, dark = false }) {
  return (
    <header
      className={`relative overflow-hidden ${compact ? 'pt-32 pb-12 lg:pt-36 lg:pb-14' : 'pt-32 pb-16 lg:pt-40 lg:pb-20'} ${
        dark ? 'bg-ink' : 'bg-beige/60'
      }`}
    >
      {!dark && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(600px 200px at 15% 0%, rgba(192,82,47,0.10), transparent), radial-gradient(500px 220px at 85% 100%, rgba(95,111,69,0.10), transparent)',
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-[1440px] px-5 lg:px-10"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-[12.5px] text-warm">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="transition hover:text-clay">
                Home
              </Link>
            </li>
            <li aria-hidden>·</li>
            <li className={`font-medium ${dark ? 'text-cream' : 'text-ink'}`}>{title}</li>
          </ol>
        </nav>
        <p className={`text-[11.5px] font-semibold tracking-[0.22em] uppercase ${dark ? 'text-clay' : 'text-clay'}`}>
          {eyebrow}
        </p>
        <h1
          className={`mt-3 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] font-medium tracking-[-0.02em] ${
            dark ? 'text-cream' : 'text-ink'
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-3 max-w-2xl text-[15.5px] leading-relaxed ${dark ? 'text-cream/60' : 'text-warm'}`}>
            {subtitle}
          </p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </motion.div>
    </header>
  )
}

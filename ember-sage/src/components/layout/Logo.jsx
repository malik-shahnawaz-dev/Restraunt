import { Link } from 'react-router-dom'

export default function Logo({ light = false, compact = false, to = '/' }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2.5"
      aria-label="Ember & Sage — home"
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-[-8deg] ${
          light ? 'bg-cream text-ink' : 'bg-ink text-cream'
        }`}
        aria-hidden
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.5c.4 3.2-1.4 4.6-3.2 6.2C6.7 10.5 5 12.4 5 15.3 5 18.9 8.1 21.5 12 21.5s7-2.6 7-6.2c0-2.2-1-3.7-2.3-5.1-.5 1-1.2 1.7-2.2 2.2.4-3.4-.9-7.2-2.5-9.9Z"
            fill="currentColor"
          />
          <path
            d="M12 21.5c-1.9 0-3.4-1.4-3.4-3.3 0-1.7 1.2-2.6 2.2-3.6.5-.5 1-1 1.2-1.7.9 1 3.4 2.6 3.4 5.3 0 1.9-1.5 3.3-3.4 3.3Z"
            fill={light ? '#17140F' : '#FBF7F0'}
            opacity="0.35"
          />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none whitespace-nowrap">
          <span
            className={`font-display text-[19px] font-semibold tracking-[-0.01em] ${
              light ? 'text-cream' : 'text-ink'
            }`}
          >
            Ember <span className="text-clay">&amp;</span> Sage
          </span>
          <span
            className={`mt-0.5 hidden text-[9px] font-medium tracking-[0.28em] uppercase sm:block ${
              light ? 'text-cream/50' : 'text-warm'
            }`}
          >
            Kitchen · Islamabad
          </span>
        </span>
      )}
    </Link>
  )
}

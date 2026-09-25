import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Clock3, MapPin, Star, ArrowDown } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { useData } from '../../context/MenuContext.jsx'

const ease = [0.22, 1, 0.36, 1]

const ICONS = { clock: Clock3, pin: MapPin, star: Star }

/** Split "Good Food. Good Mood." into two display lines. */
function titleLines(title = '') {
  return title
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .slice(0, 2)
}

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  const { settings, stats, getContent } = useData()
  const hero = getContent('home.hero', {
    eyebrow: `Open today · ${settings.openToday}`,
    title: 'Good Food. Good Mood.',
    subtitle: settings.tagline,
    image: '/images/hero.jpg',
    ctaLabel: 'Explore Menu',
    ctaHref: '/menu',
    data: {},
  })

  const lines = titleLines(hero.title)
  const ctaHref = hero.ctaHref || '/menu'
  const secondaryHref = hero.data?.secondaryCtaHref || '/menu'

  // Live figures first, CMS overrides second
  const heroStats = (hero.data?.stats?.length ? hero.data.stats : [
    { icon: 'clock', label: 'Open Today', value: settings.openToday },
    { icon: 'pin', label: 'Location', value: settings.city || 'Islamabad' },
    { icon: 'star', label: 'Rating', value: `${stats.rating ?? 4.9} · ${(stats.reviewCount ?? 0).toLocaleString()} reviews` },
  ]).map((item) => ({
    ...item,
    value:
      item.icon === 'clock' && !hero.data?.stats?.length
        ? settings.openToday
        : item.icon === 'star' && !hero.data?.stats?.length
          ? `${stats.rating ?? 4.9} · ${(stats.reviewCount ?? 0).toLocaleString()} reviews`
          : item.value,
  }))

  return (
    <section ref={ref} className="relative flex min-h-svh items-end overflow-hidden bg-ink" aria-label="Welcome">
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0" initial={{ scale: 1.08 }}>
        <motion.img
          src={hero.image || '/images/hero.jpg'}
          alt={hero.data?.imageAlt || 'Signature dish plated at Ember & Sage'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease }}
          className="h-full w-full object-cover object-[70%_center]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/45" aria-hidden />

      <motion.div
        style={{ opacity: fade }}
        className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pt-32 pb-16 lg:px-10 lg:pb-24"
      >
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-cream/20 bg-cream/10 px-4 py-2 text-[11.5px] font-semibold tracking-[0.2em] text-cream/90 uppercase backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay" />
            </span>
            {settings.maintenance ? 'Temporarily closed for maintenance' : hero.eyebrow || `Open today · ${settings.openToday}`}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.38, ease }}
            className="font-display text-[clamp(3rem,8.5vw,6.5rem)] leading-[0.98] font-medium tracking-[-0.03em] text-cream"
          >
            {lines[0] || hero.title}
            {lines[1] && (
              <>
                <br />
                <span className="italic text-clay">{lines[1]}</span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.52, ease }}
            className="mt-6 max-w-lg text-[16.5px] leading-relaxed text-cream/70 sm:text-[17.5px]"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.66, ease }}
            className="mt-9 flex flex-wrap gap-3.5"
          >
            <Link to={ctaHref}>
              <Button size="xl" variant="primary" className="min-w-44">
                {hero.ctaLabel || 'Explore Menu'}
              </Button>
            </Link>
            <Link to={secondaryHref}>
              <Button size="xl" variant="outline-light" className="min-w-40">
                {hero.data?.secondaryCtaLabel || 'Order Now'}
              </Button>
            </Link>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.82, ease }}
            className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-cream/12 pt-7"
          >
            {heroStats.map((i) => {
              const Icon = ICONS[i.icon] || Star
              return (
                <div key={i.label} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cream/15 text-clay">
                    <Icon size={16} strokeWidth={1.8} className={i.icon === 'star' ? 'fill-clay' : ''} />
                  </span>
                  <div>
                    <dt className="text-[10.5px] font-semibold tracking-[0.16em] text-cream/40 uppercase">{i.label}</dt>
                    <dd className="mt-0.5 text-[14px] font-medium text-cream/90">{i.value}</dd>
                  </div>
                </div>
              )
            })}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="pointer-events-none absolute right-10 bottom-8 hidden lg:flex lg:flex-col lg:items-center lg:gap-3"
          aria-hidden
        >
          <span className="text-[10px] font-semibold tracking-[0.3em] text-cream/40 uppercase [writing-mode:vertical-rl]">
            Scroll
          </span>
          <span className="relative block h-12 w-px bg-cream/20">
            <span className="animate-scroll-dot absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-clay" />
          </span>
          <ArrowDown size={13} className="text-cream/40" />
        </motion.div>
      </motion.div>
    </section>
  )
}

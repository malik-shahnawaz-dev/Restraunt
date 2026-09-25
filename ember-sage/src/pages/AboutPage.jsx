import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { Reveal, SectionHeading } from '../components/ui/Motion.jsx'
import { AboutPreview, ValueBand } from '../components/home/HomeSections.jsx'
import { restaurant } from '../data/menu.js'

const PHILOSOPHY = [
  {
    title: 'Fire & Patience',
    text: 'Charcoal grills, cast-iron sears and slow braises. We let heat and time do the work no shortcut can.',
  },
  {
    title: 'Farm to Table',
    text: 'Herbs and greens arrive each morning from Margalla foothill farms; seafood lands three times a week.',
  },
  {
    title: 'Waste Less',
    text: 'Root-to-stem cooking, composting and measured prep mean flavor with a lighter footprint.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="More Than Just a Meal"
        subtitle="Fifteen years of open flames, quiet craft, and a dining room that feels like home — only better."
      >
        <Link to="/menu">
          <Button size="lg">Order Now</Button>
        </Link>
      </PageHeader>

      <AboutPreview />

      {/* Chef feature */}
      <section className="bg-ink py-20 lg:py-28" aria-labelledby="chef-title">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:px-10">
          <Reveal>
            <div className="overflow-hidden rounded-panel shadow-lift">
              <img
                src="/images/chef-portrait.jpg"
                alt="Executive Chef Amina Rahman in the kitchen"
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
          </Reveal>
          <div>
            <SectionHeading
              light
              align="left"
              eyebrow="The chef"
              title={<span id="chef-title">Amina Rahman, <em className="font-normal italic text-clay">Executive Chef</em></span>}
            />
            <Reveal delay={0.08} className="mt-5 space-y-4 text-[15.5px] leading-relaxed text-cream/65">
              <p>
                Trained in Istanbul and London, Chef Amina returned to Islamabad with a simple obsession: food that
                tastes of place and time. She built Ember &amp; Sage around a single wood-fired hearth and a menu that
                changes with the seasons.
              </p>
              <p>
                “We don’t chase trends,” she says. “We chase the perfect bite — the one that makes the table go quiet
                for a second.”
              </p>
            </Reveal>
            <Reveal delay={0.16} className="mt-8 grid grid-cols-3 gap-4">
              {restaurant.stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-cream/10 bg-cream/5 px-4 py-4 text-center">
                  <p className="font-display text-2xl font-medium text-clay">{s.value}</p>
                  <p className="mt-1 text-[10.5px] leading-tight tracking-wide text-cream/50 uppercase">{s.label}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="phil-title">
        <SectionHeading
          eyebrow="Our philosophy"
          title={<span id="phil-title">Three rules we <em className="font-normal italic text-clay">never break</em></span>}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PHILOSOPHY.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-card border border-ink/6 bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <span className="font-display text-4xl text-clay/30" aria-hidden>
                  0{i + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-medium">{p.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-warm">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <ValueBand />
    </>
  )
}

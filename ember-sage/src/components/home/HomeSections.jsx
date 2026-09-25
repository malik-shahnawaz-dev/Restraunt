import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Quote,
  Send,
  Star,
  Users,
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import { Input, Select, Textarea } from '../ui/Input.jsx'
import { Rating, Badge } from '../ui/Badge.jsx'
import { Reveal, SectionHeading } from '../ui/Motion.jsx'
import { CategoryCard, FoodCard } from '../menu/FoodCard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { CATEGORIES, restaurant } from '../../data/menu.js'
import { GALLERY, REVIEWS } from '../../data/site.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useData } from '../../context/MenuContext.jsx'
import { api } from '../../lib/api.js'

/* —————————— Categories —————————— */
export function FeaturedCategories() {
  const navigate = useNavigate()
  const { categories, getContent } = useData()
  const copy = getContent('home.categories', {
    eyebrow: 'Browse by craving',
    title: 'What are you in the mood for?',
    subtitle: 'Eight kitchens\u2019 worth of choice \u2014 tap a category to jump straight into the menu.',
  })
  const list = categories.length ? categories : CATEGORIES
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="categories-title">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5 lg:mb-14">
        <SectionHeading
          align="left"
          eyebrow={copy.eyebrow}
          title={
            <span id="categories-title">
              {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
              {copy.data?.titleEmphasis && <em className="font-normal text-clay italic">{copy.data.titleEmphasis}</em>}
            </span>
          }
          subtitle={copy.subtitle}
        />
        <Reveal delay={0.1}>
          <Link
            to="/menu"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-clay"
          >
            View full menu
            <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 transition group-hover:border-clay group-hover:bg-clay group-hover:text-white">
              <ArrowRight size={15} />
            </span>
          </Link>
        </Reveal>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8 lg:gap-3.5">
        {list.map((c, i) => (
          <CategoryCard
            key={c.id || c.slug || c._id}
            category={{ id: c.id || c.slug, name: c.name, description: c.description, image: c.image, count: c.count ?? c.items?.length ?? 0 }}
            index={i}
            onSelect={(cat) => navigate(`/menu?category=${cat.id}`)}
          />
        ))}
      </div>
    </section>
  )
}

/* —————————— Chef’s favorites —————————— */
export function ChefFavorites() {
  const { menuItems, getContent } = useData()
  const copy = getContent('home.featured', {
    eyebrow: 'Chef’s favorites',
    title: 'Loved by regulars, crafted by chefs',
    subtitle: 'The dishes our kitchen is proudest of — seasonal, signature, and consistently ordered twice.',
    data: { titleEmphasis: 'crafted by chefs', ctaLabel: 'Explore the full menu', limit: 6 },
  })
  const limit = copy.data?.limit || 6
  const featured = menuItems.filter((m) => m.featured).slice(0, limit)
  if (menuItems.length === 0) {
    return (
      <section className="relative bg-beige/70 py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-10">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-card" />
          ))}
        </div>
      </section>
    )
  }
  return (
    <section className="relative bg-beige/70 py-20 lg:py-28" aria-labelledby="favorites-title">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={
            <span id="favorites-title">
              {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
              {copy.data?.titleEmphasis && <em className="font-normal italic text-clay">{copy.data.titleEmphasis}</em>}
            </span>
          }
          subtitle={copy.subtitle}
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {featured.map((item, i) => (
            <FoodCard key={item._id || item.id} item={item} index={i} />
          ))}
        </div>
        <Reveal className="mt-10 text-center lg:mt-12">
          <Link to="/menu">
            <Button size="lg" variant="dark">
              {copy.data?.ctaLabel || 'Explore the full menu'} <ArrowRight size={16} />
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* —————————— About preview —————————— */
export function AboutPreview() {
  const { getContent } = useData()
  const siteStats = getContent('site.stats', { data: { items: restaurant.stats } })
  const copy = getContent('home.about', {
    eyebrow: 'Our story',
    title: 'More than just a meal',
    image: '/images/chef.jpg',
    ctaLabel: 'Read our full story',
    ctaHref: '/about',
    data: {
      titleEmphasis: 'meal',
      imageAlt: 'Chef plating a dish in the Ember & Sage kitchen',
      secondaryImage: '/images/interior.jpg',
      badgeValue: '15+',
      badgeLabel: 'Years crafting',
      paragraphs: [
        'Since 2011, Ember & Sage has been a quiet obsession for Islamabad’s diners — a place where open-flame cooking meets garden-fresh produce, and every plate tells a story of patience.',
        'Chef Amina Rahman and her team bake bread at dawn, mill their own spices, and source herbs from partner farms in the Margalla foothills. Nothing rushed, nothing ordinary.',
      ],
    },
  })
  const stats = siteStats.data?.items?.length ? siteStats.data.items : restaurant.stats
  const paragraphs = copy.data?.paragraphs?.length ? copy.data.paragraphs : ['']

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="about-title">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-panel shadow-lift">
            <img
              src={copy.image || '/images/chef.jpg'}
              alt={copy.data?.imageAlt || 'Chef plating a dish in the Ember & Sage kitchen'}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04] sm:aspect-[5/5]"
              loading="lazy"
            />
          </div>
          {copy.data?.secondaryImage && (
            <div className="absolute -right-3 -bottom-6 hidden w-44 overflow-hidden rounded-2xl border-4 border-cream shadow-lift sm:block lg:w-52">
              <img src={copy.data.secondaryImage} alt="Restaurant interior" className="aspect-[4/5] w-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="absolute -top-5 -left-3 hidden rounded-2xl bg-ink px-5 py-4 text-cream shadow-lift sm:block">
            <p className="font-display text-3xl font-medium text-clay">{copy.data?.badgeValue || stats[0]?.value}</p>
            <p className="text-[11px] tracking-[0.14em] text-cream/60 uppercase">{copy.data?.badgeLabel || 'Years crafting'}</p>
          </div>
        </Reveal>

        <div>
          <SectionHeading
            align="left"
            eyebrow={copy.eyebrow}
            title={
              <span id="about-title">
                {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
                {copy.data?.titleEmphasis && <em className="font-normal italic text-clay">{copy.data.titleEmphasis}</em>}
              </span>
            }
          />
          <Reveal delay={0.08}>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={index === 0 ? 'mt-5 text-[15.5px] leading-relaxed text-ink-600' : 'mt-4 text-[15.5px] leading-relaxed text-warm'}>
                {paragraph}
              </p>
            ))}
          </Reveal>

          <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={0.1 + i * 0.06}>
                <div className="rounded-2xl border border-ink/6 bg-white px-4 py-4 text-center shadow-soft">
                  <p className="font-display text-[26px] leading-none font-medium text-ink">{s.value}</p>
                  <p className="mt-1.5 text-[11px] leading-tight font-medium tracking-wide text-warm uppercase">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <Link to={copy.ctaHref || '/about'} className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-clay">
              {copy.ctaLabel || 'Read our full story'}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* —————————— Gallery preview —————————— */
export function GalleryPreview() {
  const navigate = useNavigate()
  const { gallery, getContent } = useData()
  const copy = getContent('home.gallery', {
    eyebrow: 'The gallery',
    title: 'A glimpse inside the house',
    subtitle: 'Warm light, open flames, and rooms made for lingering.',
    data: { titleEmphasis: 'the house', ctaLabel: 'View full gallery' },
  })
  const shots = (gallery.length ? gallery : GALLERY).slice(0, 6)
  return (
    <section className="bg-ink py-20 lg:py-28" aria-labelledby="gallery-title">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
        <SectionHeading
          light
          eyebrow={copy.eyebrow}
          title={
            <span id="gallery-title">
              {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
              {copy.data?.titleEmphasis && <em className="font-normal italic text-clay">{copy.data.titleEmphasis}</em>}
            </span>
          }
          subtitle={copy.subtitle}
        />
        <div className="mt-10 grid auto-rows-[150px] grid-cols-2 gap-3.5 sm:auto-rows-[190px] lg:grid-cols-4 lg:grid-rows-2">
          {shots.map((g, i) => (
            <motion.button
              key={g._id || g.id}
              type="button"
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate('/gallery')}
              className={`group relative overflow-hidden rounded-2xl cursor-pointer ${
                i === 0 ? 'lg:row-span-2 lg:col-span-1' : i === 3 ? 'lg:col-span-2' : ''
              } ${i === 0 ? 'row-span-2' : ''}`}
              aria-label={`Open gallery — ${g.title || g.alt}`}
            >
              <img
                src={g.image || g.src || '/images/kitchen.jpg'}
                alt={g.title || g.alt || 'Ember & Sage'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/35" />
              <span className="absolute bottom-3 left-3 translate-y-2 rounded-full bg-cream/95 px-3 py-1 text-[11px] font-semibold text-ink opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                {g.category || g.tag}
              </span>
            </motion.button>
          ))}
        </div>
        <Reveal className="mt-8 text-center">
          <Link to="/gallery">
            <Button variant="outline-light" size="lg">
              {copy.data?.ctaLabel || 'View full gallery'}
            </Button>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* —————————— Reviews —————————— */
export function ReviewsSection() {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [reviews, setReviews] = useState(REVIEWS)
  const { stats, getContent } = useData()
  const copy = getContent('home.reviews', {
    eyebrow: 'Guest stories',
    title: 'Rated 4.9 by our guests',
    subtitle: 'Reviews from dine-in, pickup and delivery customers.',
    data: { titleEmphasis: '4.9' },
  })
  const average = stats.rating || 4.9
  const total = stats.reviewCount || 0

  useEffect(() => {
    let alive = true
    api
      .get('/reviews?limit=10')
      .then((d) => {
        if (alive && d.reviews?.length) setReviews(d.reviews)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const visible = [
    reviews[index % reviews.length],
    reviews[(index + 1) % reviews.length],
    reviews[(index + 2) % reviews.length],
  ]

  const step = (d) => {
    setDir(d)
    setIndex((i) => (i + d + reviews.length) % reviews.length)
  }

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="reviews-title">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          align="left"
          eyebrow={copy.eyebrow}
          title={
            <span id="reviews-title">
              Rated <em className="font-normal italic text-clay">{average}</em> by our guests
            </span>
          }
          subtitle={`${total.toLocaleString()} reviews from dine-in, pickup and delivery customers.`}
        />
        <Reveal className="flex items-center gap-4">
          <div className="rounded-2xl border border-ink/8 bg-white px-5 py-4 text-center shadow-soft">
            <p className="font-display text-4xl leading-none font-medium text-ink">{average}</p>
            <div className="mt-1.5 flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} className="fill-clay text-clay" strokeWidth={0} />
              ))}
            </div>
            <p className="mt-1 text-[11px] tracking-wide text-warm uppercase">Excellent</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous reviews"
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-ink/12 text-ink transition hover:border-clay hover:bg-clay hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next reviews"
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-ink/12 text-ink transition hover:border-clay hover:bg-clay hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </Reveal>
      </div>

      <div className="mt-10 grid gap-4.5 md:grid-cols-3 lg:mt-12">
        <AnimatePresence mode="popLayout" custom={dir}>
          {visible.filter(Boolean).map((r, i) => (
            <motion.figure
              key={`${r.id || r._id}-${index}`}
              initial={{ opacity: 0, x: dir * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -30 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col rounded-card border border-ink/6 bg-white p-6 shadow-soft"
            >
              <Quote size={22} className="text-clay/40" aria-hidden />
              <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-600">{r.text}</blockquote>
              <Rating value={r.rating} size={13} showValue={false} className="mt-4" />
              <figcaption className="mt-4 flex items-center gap-3 border-t border-ink/6 pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-sm text-cream" aria-hidden>
                  {r.initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{r.name}</span>
                  <span className="block truncate text-[12.5px] text-warm">
                    Ordered {r.dish} · {r.date}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

/* —————————— Reservation —————————— */
export function ReservationSection() {
  const { settings, getContent } = useData()
  const copy = getContent('home.reservation', {
    eyebrow: 'Reservations',
    title: 'Save your table at the house',
    subtitle: 'Intimate dinners, celebrations, or a quiet corner for two — we’ll have it ready.',
    image: '/images/ambiance.jpg',
    data: { titleEmphasis: 'the house', formNote: 'We’ll confirm within 30 minutes during opening hours.' },
  })
  const hours = settings.hours?.length ? settings.hours : restaurant.hours
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '7:30 PM', guests: '2', notes: '' })
  const [errors, setErrors] = useState({})
  const toast = useToast()
  const { user } = useAuth()

  /** Signed-in guests never retype their details, and the booking is linked to their account. */
  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      name: f.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: f.email || user.email || '',
      phone: f.phone || user.phone || '',
    }))
  }, [user])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please enter your name'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.phone.trim()) errs.phone = 'Phone number is required'
    if (!form.date) errs.date = 'Choose a date'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await api.post('/reservations', form)
      setDone(true)
      toast.success('Table requested', 'We’ll confirm your reservation by email shortly.')
    } catch (err) {
      toast.error('Reservation failed', err.message)
    }
  }

  return (
    <section className="relative overflow-hidden bg-ink py-20 lg:py-28" aria-labelledby="reserve-title">
      <img
        src={copy.image || '/images/ambiance.jpg'}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/55" aria-hidden />

      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-10">
        <div>
          <SectionHeading
            light
            align="left"
            eyebrow={copy.eyebrow}
            title={
              <span id="reserve-title">
                {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
                {copy.data?.titleEmphasis && <em className="font-normal italic text-clay">{copy.data.titleEmphasis}</em>}
              </span>
            }
            subtitle={copy.subtitle}
          />
          <Reveal delay={0.1} className="mt-8 space-y-3.5">
            {hours.map((h) => (
              <p key={h.days} className="flex items-center justify-between border-b border-cream/10 pb-3 text-[14.5px]">
                <span className="text-cream/60">{h.days}</span>
                <span className="font-medium text-cream">{h.time}</span>
              </p>
            ))}
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="rounded-panel border border-cream/10 bg-cream p-6 shadow-lift sm:p-8">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
                    <CalendarDays size={26} strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-medium">Reservation requested!</h3>
                  <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-relaxed text-warm">
                    Thank you, {form.name.split(' ')[0]}. We’ve received your request for {form.guests}{' '}
                    {Number(form.guests) === 1 ? 'guest' : 'guests'} on {form.date} at {form.time}. A confirmation
                    is on its way to {form.email}.
                  </p>
                  <Button className="mt-6" variant="outline" onClick={() => setDone(false)}>
                    Make another reservation
                  </Button>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={submit} noValidate>
                  <h3 className="font-display text-[22px] font-medium">Reserve a Table</h3>
                  <p className="mt-1 text-[13.5px] text-warm">{copy.data?.formNote || 'We’ll confirm within 30 minutes during opening hours.'}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Input label="Name" required placeholder="Your full name" value={form.name} onChange={set('name')} error={errors.name} />
                    <Input label="Email" type="email" required placeholder="you@email.com" value={form.email} onChange={set('email')} error={errors.email} />
                    <Input label="Phone" type="tel" required placeholder="+92 300 0000000" value={form.phone} onChange={set('phone')} error={errors.phone} />
                    <Input label="Date" type="date" required value={form.date} onChange={set('date')} error={errors.date} />
                    <Select label="Time" value={form.time} onChange={set('time')}>
                      {['12:00 PM', '1:30 PM', '6:00 PM', '7:30 PM', '8:00 PM', '9:30 PM'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                    <Select label="Guests" value={form.guests} onChange={set('guests')}>
                      {['1', '2', '3', '4', '5', '6', '8', '10+'].map((g) => (
                        <option key={g} value={g}>
                          {g} {g === '1' ? 'guest' : 'guests'}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Textarea
                    className="mt-4"
                    label="Special request"
                    placeholder="Anniversary, window seat, allergies…"
                    rows={3}
                    value={form.notes}
                    onChange={set('notes')}
                  />
                  <Button type="submit" size="lg" className="mt-5 w-full">
                    Reserve a Table
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* —————————— Contact strip —————————— */
export function ContactSection() {
  const { settings, getContent } = useData()
  const copy = getContent('home.contact', {
    eyebrow: 'Contact',
    title: 'Say hello',
    subtitle: 'Questions, private events, or feedback — we read every message.',
    data: { titleEmphasis: 'hello' },
  })
  const details = [
    { icon: MapPin, label: 'Address', value: settings.address },
    { icon: Phone, label: 'Phone', value: settings.phone },
    { icon: Mail, label: 'Email', value: settings.email },
  ]
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (form.message.trim().length < 10) errs.message = 'Tell us a little more (10+ characters)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await api.post('/contact', form)
      setSent(true)
      toast.success('Message sent', 'Our team will reply within one business day.')
    } catch (err) {
      toast.error('Could not send', err.message)
    }
  }

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="contact-title">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <SectionHeading
            align="left"
            eyebrow={copy.eyebrow}
            title={
              <span id="contact-title">
                {String(copy.title || '').replace(copy.data?.titleEmphasis || '', '')}
                {copy.data?.titleEmphasis && <em className="font-normal italic text-clay">{copy.data.titleEmphasis}</em>}
              </span>
            }
            subtitle={copy.subtitle}
          />
          <Reveal delay={0.08} className="mt-8 space-y-4">
            {details.map((c) => (
              <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-ink/6 bg-white p-4 shadow-soft">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay-soft text-clay">
                  <c.icon size={18} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[11px] font-semibold tracking-[0.16em] text-warm uppercase">{c.label}</span>
                  <span className="mt-0.5 block text-[14.5px] font-medium text-ink">{c.value}</span>
                </span>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.14} className="mt-5">
            <div
              className="relative h-44 overflow-hidden rounded-card border border-ink/8 bg-beige shadow-soft"
              role="img"
              aria-label="Map showing Ember & Sage location in F-7 Markaz, Islamabad"
            >
              <svg viewBox="0 0 400 180" className="h-full w-full" aria-hidden>
                <rect width="400" height="180" fill="#F2EADB" />
                <g stroke="#E0D4BE" strokeWidth="6" fill="none">
                  <path d="M0 60 H400 M0 130 H400 M80 0 V180 M220 0 V180 M330 0 V180" />
                </g>
                <g fill="#E7DCC9">
                  <rect x="95" y="15" width="55" height="35" rx="4" />
                  <rect x="235" y="75" width="70" height="40" rx="4" />
                  <rect x="20" y="140" width="45" height="30" rx="4" />
                  <rect x="345" y="20" width="45" height="30" rx="4" />
                </g>
                <g fill="#5F6F45" opacity="0.25">
                  <circle cx="160" cy="105" r="34" />
                  <circle cx="360" cy="150" r="26" />
                </g>
                <circle cx="220" cy="60" r="26" fill="#C0522F" opacity="0.18">
                  <animate attributeName="r" values="20;30;20" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="220" cy="60" r="8" fill="#C0522F" />
                <circle cx="220" cy="60" r="3" fill="#FBF7F0" />
              </svg>
              <span className="absolute right-3 bottom-3 rounded-full bg-white/95 px-3 py-1.5 text-[11.5px] font-semibold text-ink shadow-soft">
                F-7 Markaz · Islamabad
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-panel border border-ink/6 bg-white p-6 shadow-soft sm:p-8">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
                    <Send size={22} />
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-medium">Message received</h3>
                  <p className="mt-2 text-[14.5px] text-warm">Thanks {form.name.split(' ')[0]} — we’ll be in touch soon.</p>
                  <Button variant="outline" className="mt-6" onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }) }}>
                    Send another
                  </Button>
                </motion.div>
              ) : (
                <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={submit} noValidate>
                  <h3 className="font-display text-[22px] font-medium">Send a message</h3>
                  <div className="mt-5 space-y-4">
                    <Input label="Name" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
                    <Input label="Email" type="email" required placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
                    <Textarea label="Message" required rows={6} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} error={errors.message} />
                  </div>
                  <Button type="submit" size="lg" className="mt-5 w-full">
                    Send Message
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* —————————— Value props band —————————— */
export function ValueBand() {
  const { getContent } = useData()
  const copy = getContent('home.values', {
    title: 'Why guests keep coming back',
    data: {
      items: [
        { title: 'Farm-fresh daily', text: 'Produce from Margalla partner farms, delivered each morning.' },
        { title: '30-minute delivery', text: 'Insulated bags and live routing keep every dish restaurant-hot.' },
        { title: 'Open-flame kitchen', text: 'Charcoal, cast iron and wood — flavor you can hear sizzle.' },
      ],
    },
  })
  const items = copy.data?.items?.length
    ? copy.data.items
    : [
        { title: 'Farm-fresh daily', text: 'Produce from Margalla partner farms, delivered each morning.' },
        { title: '30-minute delivery', text: 'Insulated bags and live routing keep every dish restaurant-hot.' },
        { title: 'Open-flame kitchen', text: 'Charcoal, cast iron and wood — flavor you can hear sizzle.' },
      ]
  return (
    <section className="border-y border-ink/6 bg-white/60">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-10 sm:grid-cols-3 lg:px-10">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08} className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-olive-soft text-olive" aria-hidden>
              <Users size={17} strokeWidth={1.7} />
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-ink">{it.title}</span>
              <span className="mt-0.5 block text-[13.5px] leading-relaxed text-warm">{it.text}</span>
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

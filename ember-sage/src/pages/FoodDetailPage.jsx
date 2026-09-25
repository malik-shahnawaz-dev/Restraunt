import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  Flame,
  Heart,
  Leaf,
  ShoppingBag,
  Star,
} from 'lucide-react'
import { DietTags, Rating } from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { QuantityStepper, EmptyState, Reveal } from '../components/ui/Motion.jsx'
import { Input, Textarea } from '../components/ui/Input.jsx'
import { FoodCard } from '../components/menu/FoodCard.jsx'
import { CUSTOMIZATION } from '../data/menu.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/MenuContext.jsx'
import { usePageMeta } from '../lib/seo.js'
import { api } from '../lib/api.js'

/** Live reviews for this dish, plus a form for signed-in guests to add theirs. */
function DishReviews({ item }) {
  const toast = useToast()
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    if (!item?._id) return
    api
      .get(`/reviews?menuItem=${item._id}&limit=20`)
      .then((d) => setReviews(d.reviews || []))
      .catch(() => setReviews([]))
  }, [item?._id])

  useEffect(load, [load])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/reviews', { rating, text, menuItemId: item._id, dish: item.name })
      setText('')
      setRating(5)
      toast.success('Review posted', 'Thanks — it is live on this dish right away.')
      load()
    } catch (err) {
      toast.error('Could not post review', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="border-t border-ink/8 py-14 lg:py-20" aria-labelledby="dish-reviews-title">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div>
          <h2 id="dish-reviews-title" className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-medium">
            What guests <em className="font-normal text-clay italic">say</em>
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-4 text-[14.5px] text-warm">No reviews for this dish yet — be the first.</p>
          ) : (
            <ul className="mt-6 space-y-5">
              {reviews.map((review) => (
                <li key={review._id} className="rounded-card border border-ink/6 bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-beige text-[13px] font-semibold text-ink-600">
                      {review.initials || review.name?.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{review.name}</p>
                      <p className="text-[12.5px] text-warm">
                        {new Date(review.date || review.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {review.dish ? ` · ${review.dish}` : ''}
                      </p>
                    </div>
                    <Rating value={review.rating} className="ml-auto" size={13} />
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{review.text}</p>
                  {review.reply && (
                    <p className="mt-3 rounded-xl bg-beige px-4 py-3 text-[13.5px] text-ink-600">
                      <span className="font-semibold">Ember &amp; Sage replied:</span> {review.reply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h3 className="font-display text-lg font-medium">Rate this dish</h3>
          {user ? (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    className={`grid h-10 w-10 cursor-pointer place-items-center rounded-xl border transition ${
                      value <= rating ? 'border-clay bg-clay-soft text-clay' : 'border-ink/10 text-warm'
                    }`}
                  >
                    <Star size={18} className={value <= rating ? 'fill-clay' : ''} />
                  </button>
                ))}
              </div>
              <Textarea
                label="Your review"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="How was it cooked, seasoned, plated?"
              />
              <Button type="submit" loading={saving} disabled={text.trim().length < 10}>
                Post review
              </Button>
              <p className="text-[12px] text-warm">Posted publicly with your name — 10 characters minimum.</p>
            </form>
          ) : (
            <p className="mt-3 text-[13.5px] text-warm">
              <Link to="/login" className="font-medium text-clay hover:underline">
                Sign in
              </Link>{' '}
              to review this dish.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function FoodDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { menuItems, getItem, recordView } = useData()
  const item = getItem(id)
  const { addItem, openCart } = useCart()
  const toast = useToast()
  const { user, refreshUser } = useAuth()

  const [qty, setQty] = useState(1)
  const [size, setSize] = useState('regular')
  const [addons, setAddons] = useState([])
  const [notes, setNotes] = useState('')
  const [fav, setFav] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setQty(1)
    setSize('regular')
    setAddons([])
    setNotes('')
  }, [id])

  useEffect(() => {
    if (!item) return
    setFav(Boolean(user?.favorites?.some((f) => String(f) === String(item._id))))
    recordView(item._id)
  }, [item?._id, user?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  usePageMeta(item ? { title: item.name, description: item.description?.slice(0, 155) } : undefined)

  const unitPrice = useMemo(() => {
    if (!item) return 0
    const sizeDelta = CUSTOMIZATION.sizes.find((s) => s.id === size)?.priceDelta || 0
    const addonTotal = addons.reduce((s, a) => s + a.price, 0)
    return item.price + sizeDelta + addonTotal
  }, [item, size, addons])

  const related = useMemo(
    () =>
      item
        ? [
            ...new Set([
              ...menuItems.filter((m) => m.category === item.category && m._id !== item._id),
              ...menuItems.filter((m) => m.featured && m._id !== item._id),
            ]),
          ].slice(0, 4)
        : [],
    [menuItems, item],
  )

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-40 pb-24">
        <EmptyState
          icon={ShoppingBag}
          title="Dish not found"
          message="This item may have been removed or the link is incorrect."
          action={
            <Link to="/menu">
              <Button>Browse menu</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const toggleAddon = (addon) => {
    setAddons((prev) => (prev.find((a) => a.id === addon.id) ? prev.filter((a) => a.id !== addon.id) : [...prev, addon]))
  }

  const handleAdd = () => {
    if (!item.available) {
      toast.warning('Unavailable', `${item.name} is out of stock right now.`)
      return
    }
    addItem(item, { qty, size, addons, notes })
    toast.success('Added to cart', `${qty} × ${item.name}${size === 'large' ? ' (Large)' : ''}`)
    openCart()
  }

  const toggleFav = async () => {
    if (!user) {
      toast.info('Sign in required', 'Log in to save favorites.')
      navigate('/login', { state: { from: `/menu/${id}` } })
      return
    }
    const next = !fav
    setFav(next)
    try {
      await api.post(`/users/me/favorites/${item._id}`)
      await refreshUser()
      toast.success(next ? 'Saved to favorites' : 'Removed from favorites', item.name)
    } catch (e) {
      setFav(!next)
      toast.error('Could not update favorites', e.message)
    }
  }

  return (
    <article className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
        <nav className="flex items-center gap-2 py-5 text-[13px] text-warm" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex cursor-pointer items-center gap-1.5 transition hover:text-clay"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span aria-hidden>·</span>
          <Link to="/" className="transition hover:text-clay">Home</Link>
          <span aria-hidden>·</span>
          <Link to="/menu" className="transition hover:text-clay">Menu</Link>
          <span aria-hidden>·</span>
          <span className="font-medium text-ink">{item.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          {/* Image column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="relative overflow-hidden rounded-panel bg-beige shadow-lift">
              <img
                src={item.image || '/images/kitchen.jpg'}
                alt={item.name}
                onLoad={() => setImgLoaded(true)}
                className={`aspect-[4/3] w-full object-cover transition-all duration-700 lg:aspect-[5/4] ${
                  imgLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                }`}
              />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <Rating value={item.rating} count={item.reviewCount ?? item.reviews} className="rounded-full bg-white/92 px-3 py-1.5 backdrop-blur" size={13} />
              </div>
              <button
                type="button"
                onClick={toggleFav}
                aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={fav}
                className={`absolute top-4 right-4 grid h-11 w-11 cursor-pointer place-items-center rounded-full backdrop-blur transition-all ${
                  fav ? 'bg-clay text-white' : 'bg-white/90 text-ink hover:bg-white'
                }`}
              >
                <Heart size={18} className={fav ? 'fill-white' : ''} />
              </button>
            </div>

            {/* Ingredients & allergens */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-ink/6 bg-white p-5 shadow-soft">
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-warm uppercase">Ingredients</h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {item.ingredients.map((ing) => (
                    <li key={ing} className="rounded-full bg-beige px-2.5 py-1 text-[12.5px] text-ink-600">
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-ink/6 bg-white p-5 shadow-soft">
                <h2 className="text-[11px] font-semibold tracking-[0.18em] text-warm uppercase">Allergens</h2>
                {item.allergens.length ? (
                  <p className="mt-3 flex items-start gap-2 text-[13.5px] text-ink-600">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
                    Contains {item.allergens.join(', ')}. Please inform your server of any allergies.
                  </p>
                ) : (
                  <p className="mt-3 text-[13.5px] text-warm">No major allergens listed.</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Details column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="pb-10"
          >
            <DietTags tags={item.tags} />
            <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.06] font-medium tracking-[-0.02em]">
              {item.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="font-display text-[28px] font-medium text-clay">${unitPrice.toFixed(2)}</p>
              <Rating value={item.rating} count={item.reviewCount ?? item.reviews} size={15} />
              <span className="flex items-center gap-1.5 text-[13.5px] text-warm">
                <Clock3 size={14} /> {item.prepTime} min prep
              </span>
              <span className="flex items-center gap-1.5 text-[13.5px] text-warm">
                <Flame size={14} /> {item.calories} cal
              </span>
            </div>

            <p className="mt-5 text-[15.5px] leading-relaxed text-ink-600">{item.longDescription || item.description}</p>

            {!item.available && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-[14px] font-medium text-danger">
                <AlertCircle size={16} /> Currently out of stock — try another dish or check back soon.
              </p>
            )}

            {/* Size */}
            <fieldset className="mt-8">
              <legend className="mb-3 text-[13px] font-semibold tracking-[0.14em] text-ink-600 uppercase">
                Choose size
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {CUSTOMIZATION.sizes.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                      size === s.id ? 'border-clay bg-clay-soft/50 shadow-soft' : 'border-ink/10 bg-white hover:border-warm-light'
                    }`}
                  >
                    <input type="radio" name="size" value={s.id} checked={size === s.id} onChange={() => setSize(s.id)} className="sr-only" />
                    <span className="text-sm font-medium text-ink">{s.label}</span>
                    <span className="text-[13.5px] text-warm">{s.priceDelta ? `+$${s.priceDelta.toFixed(2)}` : 'Included'}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Add-ons */}
            <fieldset className="mt-7">
              <legend className="mb-3 text-[13px] font-semibold tracking-[0.14em] text-ink-600 uppercase">
                Add-ons <span className="font-normal text-warm normal-case">(optional)</span>
              </legend>
              <div className="space-y-2.5">
                {CUSTOMIZATION.addons.map((a) => {
                  const on = addons.find((x) => x.id === a.id)
                  return (
                    <label
                      key={a.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                        on ? 'border-clay bg-clay-soft/40' : 'border-ink/10 bg-white hover:border-warm-light'
                      }`}
                    >
                      <input type="checkbox" checked={Boolean(on)} onChange={() => toggleAddon(a)} className="sr-only peer" />
                      <span
                        aria-hidden
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-clay/30 ${
                          on ? 'border-clay bg-clay text-white' : 'border-ink/25 bg-white'
                        }`}
                      >
                        <Check size={13} strokeWidth={3} className={on ? 'opacity-100' : 'opacity-0'} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-ink">{a.label}</span>
                      <span className="text-[13.5px] text-warm">+${a.price.toFixed(2)}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Notes */}
            <Textarea
              className="mt-7"
              label="Special instructions"
              placeholder="Add a note for the kitchen..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={240}
              hint={`${notes.length}/240 characters`}
            />

            {/* Qty + Add */}
            <div className="sticky bottom-4 z-30 mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-ink/8 bg-cream/95 p-4 shadow-lift backdrop-blur">
              <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} size="lg" ariaLabel="Quantity" />
              <Button size="lg" className="flex-1 min-w-48" onClick={handleAdd} disabled={!item.available}>
                Add to Cart · ${(unitPrice * qty).toFixed(2)}
              </Button>
            </div>

            <p className="mt-4 flex items-center gap-2 text-[13px] text-warm">
              <Leaf size={14} className="text-olive" />
              Prepared fresh to order · Free delivery over $50
            </p>
          </motion.div>
        </div>

        {/* Reviews for this dish */}
        <DishReviews item={item} />

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-ink/8 py-14 lg:py-20" aria-labelledby="related-title">
            <Reveal>
              <h2 id="related-title" className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-medium">
                You might also <em className="font-normal text-clay italic">love</em>
              </h2>
            </Reveal>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r, i) => (
                <FoodCard key={r._id || r.id} item={r} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}

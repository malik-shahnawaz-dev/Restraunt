import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Clock3, Plus, ShoppingBag } from 'lucide-react'
import { DietTags, Rating } from '../ui/Badge.jsx'
import { QuantityStepper } from '../ui/Motion.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

export function FoodCard({ item, index = 0 }) {
  const { addItem, items, setQty } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const itemId = item._id || item.id

  const cartLine = items.find((l) => l.id === itemId && l.size === 'regular' && !l.addons?.length && !l.notes)
  const inCart = Boolean(cartLine)

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!item.available) {
      toast.warning('Currently unavailable', `${item.name} is out of stock right now.`)
      return
    }
    addItem(item)
    toast.success('Added to cart', `${item.name} added.`)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-ink/10 hover:shadow-lift"
    >
      <Link
        to={`/menu/${itemId}`}
        className="relative block aspect-[4/3] overflow-hidden bg-beige"
        aria-label={`View ${item.name}`}
      >
        <img
          src={item.image || '/images/kitchen.jpg'}
          alt={item.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] ${
            item.available ? '' : 'grayscale-[0.7] opacity-60'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {!item.available && (
          <span className="absolute top-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-[10.5px] font-bold tracking-[0.1em] text-cream uppercase backdrop-blur">
            Out of stock
          </span>
        )}
        {item.available && item.tags.includes('signature') && (
          <span className="absolute top-3 left-3 rounded-full bg-clay px-3 py-1 text-[10.5px] font-bold tracking-[0.08em] text-white uppercase">
            Chef’s pick
          </span>
        )}
        <span className="absolute right-3 bottom-3 flex translate-y-2 items-center gap-1 rounded-full bg-cream/95 px-3 py-1.5 text-[11.5px] font-semibold text-ink opacity-0 backdrop-blur transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
          View details →
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/menu/${itemId}`} className="min-w-0">
            <h3 className="font-display text-[17.5px] leading-snug font-medium text-ink transition-colors group-hover:text-clay-dark">
              {item.name}
            </h3>
          </Link>
          <p className="shrink-0 text-[17px] font-bold text-ink tabular-nums">${item.price.toFixed(2)}</p>
        </div>

        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-warm">{item.description}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Rating value={item.rating} count={item.reviewCount ?? item.reviews} size={13} />
          <span className="flex items-center gap-1 text-[12.5px] text-warm">
            <Clock3 size={13} /> {item.prepTime} min
          </span>
        </div>

        {item.tags.length > 0 && <DietTags tags={item.tags} className="mt-3" />}

        <div className="mt-4 flex flex-1 items-end justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate(`/menu/${itemId}`)}
            className="cursor-pointer text-[13px] font-medium text-warm underline-offset-4 transition hover:text-clay hover:underline"
          >
            Customize
          </button>

          {inCart ? (
            <div className="flex items-center gap-2">
              <QuantityStepper
                value={cartLine.qty}
                onChange={(q) => setQty(cartLine.key, q)}
                min={0}
                size="sm"
                ariaLabel={`Quantity of ${item.name}`}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!item.available}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4.5 text-[13px] font-semibold text-cream transition-all duration-300 hover:bg-clay disabled:cursor-not-allowed disabled:bg-warm-light"
              style={{ paddingLeft: '1.1rem', paddingRight: '1.1rem' }}
              aria-label={`Add ${item.name} to cart`}
            >
              {item.available ? (
                <>
                  <Plus size={14} /> Add
                </>
              ) : (
                <>
                  <ShoppingBag size={14} /> Sold out
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {inCart && (
        <span className="absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-success text-white shadow-soft" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </motion.article>
  )
}

export function CategoryCard({ category, index = 0, onSelect }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelect?.(category)}
      className="group relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-card text-left sm:aspect-[3/4]"
      aria-label={`Browse ${category.name}`}
    >
      <img
        src={category.image || '/images/kitchen.jpg'}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <span className="mb-2 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-clay text-white opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h3 className="font-display text-[21px] leading-tight font-medium text-cream">{category.name}</h3>
        <p className="mt-1 text-[13px] text-cream/60">{category.description}</p>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.14em] text-clay/90 uppercase">
          {category.count} dishes
        </p>
      </div>
    </motion.button>
  )
}

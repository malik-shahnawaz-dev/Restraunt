import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock3, Search, Star, TrendingUp } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useData } from '../../context/MenuContext.jsx'

const POPULAR = ['Truffle Mushroom Pasta', 'Ember Signature Burger', 'Herb-Crusted Ribeye']

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { addItem, openCart } = useCart()
  const toast = useToast()
  const { menuItems } = useData()

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 80)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return menuItems
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [query, menuItems])

  const go = (id) => {
    onClose()
    navigate(`/menu/${id}`)
  }

  const quickAdd = (item, e) => {
    e.stopPropagation()
    addItem(item)
    toast.success('Added to cart', `${item.name} is in your cart.`)
    onClose()
    openCart()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[97]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-ink/60 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Search dishes"
            className="absolute inset-x-4 top-[10vh] mx-auto max-w-2xl overflow-hidden rounded-panel bg-cream shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-ink/8 px-5 py-4">
              <Search size={20} className="shrink-0 text-warm" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes..."
                aria-label="Search dishes"
                className="h-9 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-warm-light outline-none"
              />
              <kbd className="hidden rounded-md border border-ink/10 bg-beige px-2 py-1 text-[11px] font-medium text-warm sm:block">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-3">
              {!query && (
                <div className="p-2">
                  <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] font-semibold tracking-[0.16em] text-warm uppercase">
                    <TrendingUp size={13} /> Popular right now
                  </p>
              <ul className="space-y-1">
                {POPULAR.map((name) => {
                  const item = menuItems.find((m) => m.name === name)
                  if (!item) return null
                  return (
                    <li key={item._id || item.id}>
                      <button
                        type="button"
                        onClick={() => go(item._id || item.id)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-beige"
                      >
                            <img src={item.image || '/images/kitchen.jpg'} alt="" className="h-11 w-11 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                              <span className="text-[12.5px] text-warm">${item.price.toFixed(2)}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {query && results.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="font-display text-lg font-medium text-ink">No dishes found</p>
                  <p className="mt-1.5 text-sm text-warm">
                    We couldn’t find anything for “{query}”. Try “pasta”, “burger” or “dessert”.
                  </p>
                </div>
              )}

              {query && results.length > 0 && (
                <ul className="space-y-1">
                  {results.map((item) => (
                    <li key={item._id || item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => go(item._id || item.id)}
                        onKeyDown={(e) => e.key === 'Enter' && go(item._id || item.id)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-beige"
                      >
                        <img src={item.image || '/images/kitchen.jpg'} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                          <p className="flex items-center gap-2 text-[12.5px] text-warm">
                            <span className="font-medium text-ink">${item.price.toFixed(2)}</span>
                            <span className="flex items-center gap-0.5">
                              <Star size={11} className="fill-clay text-clay" strokeWidth={0} /> {item.rating}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock3 size={11} /> {item.prepTime} min
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => quickAdd(item, e)}
                          className="cursor-pointer rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-cream transition hover:bg-clay"
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

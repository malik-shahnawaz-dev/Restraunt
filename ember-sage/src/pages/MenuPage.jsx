import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, SlidersHorizontal, SearchX } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { FoodCard } from '../components/menu/FoodCard.jsx'
import { CardSkeleton, EmptyState } from '../components/ui/Motion.jsx'
import Button from '../components/ui/Button.jsx'
import { SORT_OPTIONS, MENU_TABS } from '../data/menu.js'
import { useData } from '../context/MenuContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

/** “Pick up where you left off” — the dishes this account opened most recently. */
function RecentlyViewed() {
  const { user } = useAuth()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }
    let alive = true
    api
      .get('/users/me/recently-viewed')
      .then((d) => alive && setItems(d.items || []))
      .catch(() => alive && setItems([]))
    return () => {
      alive = false
    }
  }, [user])

  if (!user || items.length === 0) return null

  return (
    <section className="mb-8" aria-labelledby="recent-title">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="recent-title" className="font-display text-lg font-medium">
          Pick up where you left off
        </h2>
        <span className="text-[12.5px] text-warm">Saved to your account</span>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 lg:-mx-10 lg:px-10">
        {items.slice(0, 6).map((item, i) => (
          <div key={item._id} className="w-[240px] shrink-0">
            <FoodCard item={item} index={i} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCat = searchParams.get('category') || 'all'
  const { menuItems, categories, menuLoading } = useData()
  // Category tabs come from the live database (Admin → Categories)
  const TABS = categories.length
    ? [{ id: 'all', label: 'All' }, ...categories.map((c) => ({ id: c.slug || c.id, label: c.name }))]
    : MENU_TABS

  const [active, setActive] = useState(initialCat)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setActive(initialCat)
  }, [initialCat])

  useEffect(() => {
    if (menuLoading) return
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 280)
    return () => clearTimeout(t)
  }, [active, query, sort, menuLoading])

  const setCategory = (id) => {
    setActive(id)
    if (id === 'all') setSearchParams({})
    else setSearchParams({ category: id })
  }

  const items = useMemo(() => {
    let list = [...menuItems]
    if (active !== 'all') list = list.filter((i) => i.category === active)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    switch (sort) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        list.sort((a, b) => (b.reviewCount ?? b.reviews ?? 0) - (a.reviewCount ?? a.reviews ?? 0))
    }
    return list
  }, [active, query, sort, menuItems])

  return (
    <>
      <PageHeader
        eyebrow="The menu"
        title="Explore Our Menu"
        subtitle="Seasonal ingredients, open-flame craft and dishes made to order — search, filter and make it yours."
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-warm" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes..."
              aria-label="Search dishes"
              className="h-12 w-full rounded-full border border-ink/10 bg-white pr-5 pl-11 text-[15px] shadow-soft outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/15"
            />
          </div>

          <div className="flex items-center gap-3">
            <SlidersHorizontal size={16} className="hidden text-warm sm:block" aria-hidden />
            <label htmlFor="menu-sort" className="sr-only">
              Sort menu
            </label>
            <div className="relative">
              <select
                id="menu-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-11 cursor-pointer appearance-none rounded-full border border-ink/10 bg-white pr-9 pl-5 text-[13.5px] font-medium shadow-soft outline-none transition hover:border-warm-light focus:border-clay"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-warm" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </PageHeader>

      <section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-28" aria-label="Menu items">
        <RecentlyViewed />

        {/* Category tabs */}
        <div className="sticky top-[72px] z-40 -mx-5 border-b border-ink/6 bg-cream/92 px-5 py-3 backdrop-blur-xl lg:-mx-10 lg:px-10">
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Menu categories">
            {TABS.map((tab) => {
              const isActive = active === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setCategory(tab.id)}
                  className={`relative shrink-0 cursor-pointer rounded-full px-4.5 py-2 text-[13.5px] font-medium transition-colors ${
                    isActive ? 'text-cream' : 'text-ink-600 hover:bg-beige hover:text-ink'
                  }`}
                  style={{ paddingLeft: '1.1rem', paddingRight: '1.1rem' }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="menu-tab"
                      className="absolute inset-0 -z-10 rounded-full bg-ink"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <p className="mt-6 mb-5 text-[13.5px] text-warm" aria-live="polite">
          {loading ? 'Loading dishes…' : `Showing ${items.length} dish${items.length === 1 ? '' : 'es'}`}
          {active !== 'all' && !loading && ` in ${TABS.find((t) => t.id === active)?.label}`}
          {query && !loading && ` for “${query}”`}
        </p>

      {(loading || menuLoading) ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No dishes found"
            message={`Nothing matches “${query || TABS.find((t) => t.id === active)?.label}”. Try a different search or category.`}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setCategory('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => (
                <FoodCard key={item._id || item.id} item={item} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </section>
    </>
  )
}

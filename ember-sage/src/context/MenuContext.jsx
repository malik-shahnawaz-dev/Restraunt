import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'
import { restaurant, TAX_RATE } from '../data/menu.js'

const DataContext = createContext(null)

const FALLBACK_RESTAURANT = {
  name: restaurant.name,
  tagline: restaurant.tagline,
  phone: restaurant.phone,
  email: restaurant.email,
  address: restaurant.address,
  city: restaurant.city,
  openToday: restaurant.openToday,
  hours: restaurant.hours,
  rating: restaurant.rating,
  reviewCount: restaurant.reviewCount,
  acceptOrders: true,
  codEnabled: true,
  maintenance: false,
  freeDeliveryThreshold: 50,
  deliveryFee: 3.5,
  taxRate: TAX_RATE,
}

/** Menu, categories, CMS content, gallery, FAQs and live site stats — all from the API. */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(FALLBACK_RESTAURANT)
  const [content, setContent] = useState({})
  const [gallery, setGallery] = useState([])
  const [faqs, setFaqs] = useState([])
  const [stats, setStats] = useState({ dishes: 0, rating: restaurant.rating, reviewCount: restaurant.reviewCount })
  const [menuLoading, setMenuLoading] = useState(true)
  const [cmsLoading, setCmsLoading] = useState(true)
  const [error, setError] = useState(null)
  const viewedRef = useRef(new Set())

  const refreshMenu = useCallback(async () => {
    try {
      setMenuLoading(true)
      const [m, c] = await Promise.all([api.get('/menu'), api.get('/menu/categories')])
      setMenuItems(m.items)
      setCategories(c.categories)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setMenuLoading(false)
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const c = await api.get('/menu/categories')
      setCategories(c.categories)
    } catch {
      /* ignore */
    }
  }, [])

  const refreshSettings = useCallback(async () => {
    try {
      const d = await api.get('/settings')
      if (d.settings) setSettings({ ...FALLBACK_RESTAURANT, ...d.settings })
    } catch {
      /* keep fallback */
    }
  }, [])

  /** CMS copy blocks keyed by slug (home.hero, about.chef, site.stats …). */
  const refreshContent = useCallback(async () => {
    try {
      const d = await api.get('/content')
      setContent(d.content || {})
    } catch {
      /* keep whatever we already have */
    }
  }, [])

  const refreshGallery = useCallback(async () => {
    try {
      const d = await api.get('/gallery')
      setGallery(d.gallery || [])
    } catch {
      /* ignore */
    }
  }, [])

  const refreshFaqs = useCallback(async () => {
    try {
      const d = await api.get('/faqs')
      setFaqs(d.faqs || [])
    } catch {
      /* ignore */
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const d = await api.get('/stats')
      setStats({ ...stats, ...d })
    } catch {
      /* ignore */
    }
  }, [])

  const refreshCms = useCallback(async () => {
    setCmsLoading(true)
    await Promise.all([refreshContent(), refreshGallery(), refreshFaqs(), refreshStats()])
    setCmsLoading(false)
  }, [refreshContent, refreshGallery, refreshFaqs, refreshStats])

  useEffect(() => {
    refreshMenu()
    refreshSettings()
    refreshCms()
  }, [refreshMenu, refreshSettings, refreshCms])

  const getItem = useCallback((id) => menuItems.find((i) => i._id === id || i.id === id || i.slug === id), [menuItems])

  /** Read a CMS block with a hard-coded fallback so the UI never flashes empty. */
  const getContent = useCallback((key, fallback = {}) => ({ ...fallback, ...(content[key] || {}) }), [content])

  /** Record dish view into the user's "progress" (recently viewed). */
  const recordView = useCallback(
    async (menuItemId) => {
      if (!user || !menuItemId || viewedRef.current.has(menuItemId)) return
      viewedRef.current.add(menuItemId)
      try {
        await api.post(`/users/me/viewed/${menuItemId}`)
      } catch {
        /* non-critical */
      }
    },
    [user],
  )

  const value = useMemo(
    () => ({
      menuItems,
      categories,
      settings: { ...FALLBACK_RESTAURANT, ...settings },
      content,
      gallery,
      faqs,
      stats: { ...FALLBACK_RESTAURANT, ...stats },
      menuLoading,
      cmsLoading,
      error,
      refreshMenu,
      refreshCategories,
      refreshSettings,
      refreshContent,
      refreshGallery,
      refreshFaqs,
      refreshStats,
      refreshCms,
      getItem,
      getContent,
      recordView,
    }),
    [
      menuItems,
      categories,
      settings,
      content,
      gallery,
      faqs,
      stats,
      menuLoading,
      cmsLoading,
      error,
      refreshMenu,
      refreshCategories,
      refreshSettings,
      refreshContent,
      refreshGallery,
      refreshFaqs,
      refreshStats,
      refreshCms,
      getItem,
      getContent,
      recordView,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

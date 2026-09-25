import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'
import { TAX_RATE } from '../data/menu.js'

const DataContext = createContext(null)

const FALLBACK_RESTAURANT = {
  name: 'Ember & Sage',
  tagline: 'Good Food. Good Mood.',
  phone: '+92 51 234 5678',
  email: 'hello@emberandsage.pk',
  address: '12 Hillview Road, F-7 Markaz, Islamabad',
  openToday: '11:00 AM – 11:00 PM',
  hours: [
    { days: 'Monday – Thursday', time: '11:00 AM – 11:00 PM' },
    { days: 'Friday – Saturday', time: '11:00 AM – 12:30 AM' },
    { days: 'Sunday', time: '12:00 PM – 11:00 PM' },
  ],
  acceptOrders: true,
  codEnabled: true,
  maintenance: false,
  freeDeliveryThreshold: 50,
  deliveryFee: 3.5,
  taxRate: TAX_RATE,
}

/** Live menu, categories and restaurant settings from the API. */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(FALLBACK_RESTAURANT)
  const [menuLoading, setMenuLoading] = useState(true)
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

  useEffect(() => {
    refreshMenu()
    refreshSettings()
  }, [refreshMenu, refreshSettings])

  const getItem = useCallback((id) => menuItems.find((i) => i._id === id || i.id === id || i.slug === id), [menuItems])

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
      menuLoading,
      error,
      refreshMenu,
      refreshCategories,
      refreshSettings,
      getItem,
      recordView,
    }),
    [menuItems, categories, settings, menuLoading, error, refreshMenu, refreshCategories, refreshSettings, getItem, recordView],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'
import { useData } from './MenuContext.jsx'
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, TAX_RATE } from '../data/menu.js'

const CartContext = createContext(null)

const STORAGE_KEY = 'es_cart'

function loadGuestItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveGuest(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

function lineKey(id, size, addons, notes) {
  return [id, size, [...(addons || [])].sort().join('+'), (notes || '').trim()].join('|')
}

function toApiItems(items) {
  return items.map((i) => ({
    menuItem: i.id,
    key: i.key,
    qty: i.qty,
    size: i.size,
    addons: (i.addons || []).map((a) => ({ id: a.id, label: a.label, price: a.price })),
    notes: i.notes || '',
  }))
}

function fromApiCart(cart) {
  return (cart?.items || []).map((i) => ({
    key: i.key || lineKey(String(i.menuItem), i.size, i.addons, i.notes),
    id: String(i.menuItem),
    name: i.name,
    image: i.image,
    price: i.price,
    qty: i.qty,
    size: i.size,
    addons: i.addons || [],
    notes: i.notes || '',
  }))
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const { settings } = useData()
  const [offers, setOffers] = useState([])
  const [items, setItems] = useState(() => (user ? [] : loadGuestItems()))
  const [coupon, setCoupon] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [justAddedKey, setJustAddedKey] = useState(null)
  const [serverTotals, setServerTotals] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const syncTimer = useRef(null)
  const userRef = useRef(user)
  userRef.current = user
  // Bumped on every local mutation so a slow /cart GET from auth-sync
  // can never clobber items the user added while it was in flight.
  const cartVersion = useRef(0)

  const persistToServer = useCallback((nextItems, nextCoupon) => {
    if (!userRef.current) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      api
        .put('/cart', { items: toApiItems(nextItems), couponCode: nextCoupon?.code || null })
        .then((d) => setServerTotals(d.totals || null))
        .catch(() => {})
    }, 350)
  }, [])

  /* —— Live list of active promo codes (managed in the admin CMS) —— */
  useEffect(() => {
    let alive = true
    api
      .get('/coupons')
      .then((d) => alive && setOffers(d.coupons || []))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  /* —— Load / merge cart when auth state changes —— */
  useEffect(() => {
    let alive = true
    const startedAt = cartVersion.current
    async function sync() {
      if (user) {
        const guest = loadGuestItems()
        try {
          if (guest.length > 0) {
            const d = await api.post('/cart/merge', { items: toApiItems(guest) })
            if (!alive || cartVersion.current !== startedAt) return
            setItems(fromApiCart(d.cart))
            setCoupon(d.cart.coupon?.code ? { ...d.cart.coupon } : null)
            setServerTotals(d.totals || null)
            localStorage.removeItem(STORAGE_KEY)
          } else {
            const d = await api.get('/cart')
            if (!alive || cartVersion.current !== startedAt) return
            setItems(fromApiCart(d.cart))
            setCoupon(d.cart.coupon?.code ? { ...d.cart.coupon } : null)
            setServerTotals(d.totals || null)
          }
        } catch {
          if (alive && cartVersion.current === startedAt) setItems(guest)
        }
      } else {
        setItems(loadGuestItems())
        setCoupon(null)
      }
      if (alive) setHydrated(true)
    }
    sync()
    return () => {
      alive = false
    }
  }, [user])

  /* —— Guest persistence —— */
  useEffect(() => {
    if (!user && hydrated) saveGuest(items)
  }, [items, user, hydrated])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const addItem = useCallback(
    (item, { qty = 1, size = 'regular', addons = [], notes = '' } = {}) => {
      const id = item._id || item.id
      const key = lineKey(id, size, addons, notes)
      cartVersion.current += 1
      setItems((prev) => {
        const existing = prev.find((l) => l.key === key)
        let next
        if (existing) {
          next = prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
        } else {
          next = [
            ...prev,
            {
              key,
              id,
              name: item.name,
              image: item.image,
              price: item.price,
              qty,
              size,
              addons: addons.map((a) => ({ id: a.id, label: a.label, price: a.price })),
              notes,
            },
          ]
        }
        persistToServer(next, coupon)
        return next
      })
      setJustAddedKey(key)
      setTimeout(() => setJustAddedKey(null), 900)
      return key
    },
    [coupon, persistToServer],
  )

  const removeItem = useCallback(
    (key) => {
      cartVersion.current += 1
      setItems((prev) => {
        const next = prev.filter((l) => l.key !== key)
        persistToServer(next, coupon)
        return next
      })
    },
    [coupon, persistToServer],
  )

  const setQty = useCallback(
    (key, qty) => {
      cartVersion.current += 1
      setItems((prev) => {
        let next
        if (qty <= 0) next = prev.filter((l) => l.key !== key)
        else next = prev.map((l) => (l.key === key ? { ...l, qty } : l))
        persistToServer(next, coupon)
        return next
      })
    },
    [coupon, persistToServer],
  )

  const clearCart = useCallback(() => {
    cartVersion.current += 1
    setItems([])
    setCoupon(null)
    localStorage.removeItem(STORAGE_KEY)
    if (userRef.current) api.del('/cart').catch(() => {})
  }, [])

  const applyCoupon = useCallback(
    async (code) => {
      try {
        const subtotal = items.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0)
        const d = await api.post('/cart/coupon', { code, subtotal })
        setCoupon(d.coupon)
        if (userRef.current) {
          api.put('/cart', { items: toApiItems(items), couponCode: d.coupon.code }).catch(() => {})
        }
        return { ok: true, message: `Coupon ${d.coupon.code} applied!` }
      } catch (e) {
        return { ok: false, message: e.message }
      }
    },
    [items],
  )

  const removeCoupon = useCallback(() => {
    setCoupon(null)
    if (userRef.current) {
      api.put('/cart', { items: toApiItems(items), couponCode: null }).catch(() => {})
    }
  }, [items])

  const lineUnitPrice = useCallback((line) => {
    const addonTotal = (line.addons || []).reduce((s, a) => s + a.price, 0)
    const sizeDelta = line.size === 'large' ? 4 : 0
    return line.price + addonTotal + sizeDelta
  }, [])

  const deliveryFeeRate = settings.deliveryFee ?? DELIVERY_FEE
  const freeThreshold = settings.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD
  const taxRate = settings.taxRate ?? TAX_RATE

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0)
    const count = items.reduce((s, l) => s + l.qty, 0)

    let deliveryFee = subtotal === 0 ? 0 : subtotal >= freeThreshold ? 0 : deliveryFeeRate
    let discount = 0

    if (coupon) {
      if (coupon.type === 'percent') {
        if (!coupon.min || subtotal >= coupon.min) discount = +(subtotal * (coupon.value / 100)).toFixed(2)
      } else if (coupon.type === 'delivery') {
        deliveryFee = 0
      } else if (coupon.type === 'fixed') {
        if (!coupon.min || subtotal >= coupon.min) discount = Math.min(coupon.value, subtotal)
      }
    }

    const taxable = Math.max(subtotal - discount, 0)
    const tax = +(taxable * taxRate).toFixed(2)
    const total = +(taxable + tax + deliveryFee).toFixed(2)

    return { subtotal: +subtotal.toFixed(2), deliveryFee, tax, discount, total, count }
  }, [items, coupon, lineUnitPrice, deliveryFeeRate, freeThreshold, taxRate])

  const value = useMemo(
    () => ({
      items,
      isOpen,
      hydrated,
      justAddedKey,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
      applyCoupon,
      removeCoupon,
      coupon,
      totals,
      lineUnitPrice,
      toApiItems,
      offers,
      refreshOffers: () => api.get('/coupons').then((d) => setOffers(d.coupons || [])).catch(() => {}),
      freeDeliveryThreshold: freeThreshold,
      serverTotals,
    }),
    [items, isOpen, hydrated, justAddedKey, openCart, closeCart, addItem, removeItem, setQty, clearCart, applyCoupon, removeCoupon, coupon, totals, lineUnitPrice, offers, serverTotals, freeThreshold],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

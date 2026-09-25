import { Router } from 'express'
import { Cart, Coupon, MenuItem } from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { computeTotals } from '../utils/pricing.js'

const router = Router()
router.use(protect)

async function hydrateItems(rawItems = []) {
  const items = []
  for (const raw of rawItems) {
    const menuItem = await MenuItem.findById(raw.menuItem || raw.id)
    if (!menuItem) continue
    items.push({
      key: raw.key || [menuItem._id, raw.size || 'regular', [...(raw.addons || [])].sort().join('+'), raw.notes || ''].join('|'),
      menuItem: menuItem._id,
      name: menuItem.name,
      image: menuItem.image,
      price: menuItem.price,
      qty: Math.max(1, Math.min(99, Number(raw.qty) || 1)),
      size: raw.size === 'large' ? 'large' : 'regular',
      addons: (raw.addons || [])
        .map((a) => (typeof a === 'string' ? { id: a } : a))
        .filter(Boolean)
        .map((a) => ({ id: a.id, label: a.label || a.id, price: Number(a.price) || 0 })),
      notes: String(raw.notes || '').slice(0, 240),
    })
  }
  return items
}

router.get('/', async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] })
    const totals = computeTotals(cart.items, cart.coupon?.code ? cart.coupon : null)
    res.json({ cart, totals })
  } catch (e) {
    next(e)
  }
})

router.put('/', async (req, res, next) => {
  try {
    const { items, couponCode } = req.body
    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) cart = new Cart({ user: req.user._id })

    cart.items = Array.isArray(items) ? await hydrateItems(items) : cart.items

    if (couponCode === null) cart.coupon = undefined
    else if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), active: true })
      if (coupon) cart.coupon = { code: coupon.code, type: coupon.type, value: coupon.value, min: coupon.minOrder, label: coupon.label }
    }
    await cart.save()
    const totals = computeTotals(cart.items, cart.coupon?.code ? cart.coupon : null)
    res.json({ cart, totals })
  } catch (e) {
    next(e)
  }
})

/** Merge guest (localStorage) cart into the account cart at login. */
router.post('/merge', async (req, res, next) => {
  try {
    const incoming = await hydrateItems(req.body.items || [])
    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) cart = new Cart({ user: req.user._id, items: [] })

    for (const inc of incoming) {
      const existing = cart.items.find((i) => i.key === inc.key)
      if (existing) existing.qty = Math.min(99, existing.qty + inc.qty)
      else cart.items.push(inc)
    }
    await cart.save()
    const totals = computeTotals(cart.items, cart.coupon?.code ? cart.coupon : null)
    res.json({ cart, totals })
  } catch (e) {
    next(e)
  }
})

router.delete('/', async (req, res, next) => {
  try {
    await Cart.deleteOne({ user: req.user._id })
    res.json({ cart: { user: req.user._id, items: [] }, totals: computeTotals([], null) })
  } catch (e) {
    next(e)
  }
})

/** Validate a promo code against a subtotal (used by cart drawer & checkout). */
router.post('/coupon', async (req, res, next) => {
  try {
    const { code, subtotal } = req.body
    const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase(), active: true })
    if (!coupon) throw new ApiError(404, 'That promo code isn’t valid.')
    if (coupon.used >= coupon.usageLimit) throw new ApiError(400, 'This coupon has expired.')
    if (coupon.minOrder && Number(subtotal || 0) < coupon.minOrder) {
      throw new ApiError(400, `This code requires a $${coupon.minOrder} minimum order.`)
    }
    res.json({
      coupon: { code: coupon.code, type: coupon.type, value: coupon.value, min: coupon.minOrder, label: coupon.label || 'Coupon applied' },
    })
  } catch (e) {
    next(e)
  }
})

export default router

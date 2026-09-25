/** Pricing rules shared by cart, orders and coupons (mirror of the UI customization catalogue). */
export const SIZES = [
  { id: 'regular', label: 'Regular', priceDelta: 0 },
  { id: 'large', label: 'Large', priceDelta: 4 },
]

export const ADDONS = [
  { id: 'extra-cheese', label: 'Extra Cheese', price: 2 },
  { id: 'extra-sauce', label: 'Extra Sauce', price: 1.5 },
  { id: 'extra-toppings', label: 'Extra Toppings', price: 2.5 },
]

export const DEFAULTS = { deliveryFee: 3.5, freeDeliveryThreshold: 50, taxRate: 0.1 }

export function sizeDelta(size) {
  return SIZES.find((s) => s.id === size)?.priceDelta || 0
}

export function addonById(id) {
  return ADDONS.find((a) => a.id === id)
}

export function lineUnitPrice(item) {
  const base = item.price ?? item.unitPrice ?? 0
  return base + sizeDelta(item.size) + (item.addons || []).reduce((s, a) => s + (a.price || 0), 0)
}

/**
 * Compute order/cart totals from server-side prices.
 * items: [{ price, qty, size, addons:[{id,price}] }]  (price = base menu price)
 */
export function computeTotals(items, coupon, settings = DEFAULTS) {
  const subtotal = items.reduce((s, i) => s + lineUnitPrice(i) * i.qty, 0)
  let deliveryFee = subtotal === 0 ? 0 : subtotal >= (settings.freeDeliveryThreshold ?? 50) ? 0 : (settings.deliveryFee ?? 3.5)
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
  const tax = +(taxable * (settings.taxRate ?? 0.1)).toFixed(2)
  const total = +(taxable + tax + deliveryFee).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), deliveryFee, tax, discount, total }
}

/** Mock payment gateway. Card ending 0002 always declines (demo of failure path). */
export function chargePayment(method, payload = {}) {
  if (method === 'cod') return { status: 'pending', cardLast4: null }
  if (method === 'online') {
    if (payload.wallet === false) throw Object.assign(new Error('Online payment was rejected.'), { status: 402 })
    return { status: 'paid', cardLast4: null }
  }
  const digits = String(payload.cardNumber || '').replace(/\D/g, '')
  if (digits.length < 15) throw Object.assign(new Error('Invalid card number.'), { status: 400 })
  if (digits.endsWith('0002')) throw Object.assign(new Error('Your card was declined. Try another payment method.'), { status: 402 })
  return { status: 'paid', cardLast4: digits.slice(-4) }
}

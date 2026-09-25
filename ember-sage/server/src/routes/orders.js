import { Router } from 'express'
import {
  Order,
  Cart,
  MenuItem,
  Coupon,
  Payment,
  Notification,
  Setting,
  Review,
  nextOrderNumber,
  pushTimeline,
} from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { Types } from '../db/orm.js'
import { ApiError } from '../middleware/error.js'
import { computeTotals, chargePayment } from '../utils/pricing.js'
import { sendEmail, templates } from '../utils/email.js'

const router = Router()

async function getSettings() {
  const s = await Setting.findOne({ key: 'restaurant' })
  return s || {}
}

function notify(userId, type, title, message) {
  return Notification.create({ user: userId, type, title, message })
}

/* ═════════ Create order (full checkout) ═════════ */
router.post('/', protect, async (req, res, next) => {
  try {
    const settings = await getSettings()
    if (settings.maintenance || settings.acceptOrders === false) {
      throw new ApiError(503, 'We are temporarily not accepting online orders.')
    }

    const { items, fulfillment, address, pickupTime, payment, notes, contact, couponCode } = req.body
    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Your cart is empty.')

    // Re-price everything from the database — never trust client totals
    const priced = []
    for (const line of items) {
      const menuItem = await MenuItem.findById(line.menuItem || line.id)
      if (!menuItem) throw new ApiError(400, 'A dish in your cart is no longer available.')
      if (!menuItem.available) throw new ApiError(409, `${menuItem.name} is currently out of stock.`)
      priced.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        image: menuItem.image,
        unitPrice: menuItem.price,
        qty: Math.max(1, Number(line.qty) || 1),
        size: line.size === 'large' ? 'large' : 'regular',
        addons: (line.addons || []).map((a) => ({ id: a.id, label: a.label, price: Number(a.price) || 0 })),
        notes: String(line.notes || '').slice(0, 240),
      })
    }

    let coupon = null
    const code = couponCode || req.body.coupon?.code
    if (code) {
      coupon = await Coupon.findOne({ code: String(code).toUpperCase(), active: true })
      if (!coupon) throw new ApiError(400, 'Invalid coupon code.')
    }

    const totals = computeTotals(priced, coupon, {
      deliveryFee: settings.deliveryFee ?? 3.5,
      freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 50,
      taxRate: settings.taxRate ?? 0.1,
    })

    if (fulfillment === 'delivery') {
      if (!address?.line || !address?.city || !address?.postal) {
        throw new ApiError(400, 'Delivery address is required.')
      }
    }

    // Mock payment gateway
    let payStatus = 'pending'
    try {
      const result = chargePayment(payment?.method || 'card', payment || {})
      payStatus = result.status
    } catch (e) {
      const orderFailed = await Order.create({
        orderNumber: await nextOrderNumber(),
        user: req.user._id,
        items: priced,
        ...totals,
        paymentMethod: payment?.method || 'card',
        paymentStatus: 'failed',
        orderStatus: 'Cancelled',
        fulfillment: fulfillment || 'delivery',
        deliveryAddress: address || undefined,
        pickupTime,
        customerNotes: notes || '',
        contact: { name: contact?.name || `${req.user.firstName} ${req.user.lastName}`, email: contact?.email || req.user.email, phone: contact?.phone || req.user.phone },
        etaMinutes: fulfillment === 'pickup' ? 20 : 40,
        timeline: [{ status: 'Cancelled', at: new Date(), note: 'Payment failed' }],
      })
      await Payment.create({
        order: orderFailed._id,
        user: req.user._id,
        method: payment?.method || 'card',
        status: 'failed',
        amount: totals.total,
        cardLast4: String(payment?.cardNumber || '').replace(/\D/g, '').slice(-4),
      })
      throw new ApiError(e.status || 402, e.message)
    }

    const order = await Order.create({
      orderNumber: await nextOrderNumber(),
      user: req.user._id,
      items: priced,
      ...totals,
      couponCode: coupon?.code,
      paymentMethod: payment?.method || 'card',
      paymentStatus: payStatus,
      orderStatus: settings.autoConfirm ? 'Confirmed' : 'Pending',
      fulfillment: fulfillment || 'delivery',
      deliveryAddress: address || undefined,
      pickupTime,
      customerNotes: notes || '',
      contact: {
        name: contact?.name || `${req.user.firstName} ${req.user.lastName}`,
        email: contact?.email || req.user.email,
        phone: contact?.phone || req.user.phone,
      },
      etaMinutes: fulfillment === 'pickup' ? 20 : 40,
      timeline: [{ status: settings.autoConfirm ? 'Confirmed' : 'Pending', at: new Date() }],
    })

    await Payment.create({
      order: order._id,
      user: req.user._id,
      method: payment?.method || 'card',
      status: payStatus,
      amount: totals.total,
      cardLast4: String(payment?.cardNumber || '').replace(/\D/g, '').slice(-4) || null,
    })

    if (coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { used: 1 } })

    // Clear the account cart
    await Cart.deleteOne({ user: req.user._id })

    // Notifications + transactional emails
    await Promise.all([
      notify(req.user._id, 'payment', `Payment confirmed`, `$${totals.total.toFixed(2)} received for order #${order.orderNumber}.`),
      notify(req.user._id, 'order', `Order #${order.orderNumber} confirmed`, 'We’ve received your order and are preparing your food.'),
      sendEmail({ to: order.contact.email, ...templates.orderConfirmed(order), template: 'orderConfirmed' }),
    ])

    res.status(201).json({ order })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Customer: my orders ═════════ */
router.get('/mine', protect, async (req, res, next) => {
  try {
    const filter = { user: req.user._id }
    if (req.query.status) filter.orderStatus = req.query.status
    const orders = await Order.find(filter).sort({ createdAt: -1 })
    res.json({ orders })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Tracking / detail (owner or admin) ═════════ */
router.get('/:id/tracking', protect, async (req, res, next) => {
  try {
    const order = await resolveOrder(req.params.id, req.user)
    res.json({ order: toTrackingPayload(order) })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await resolveOrder(req.params.id, req.user)
    res.json({ order })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Customer: cancel an order ═════════ */
router.post('/:id/cancel', protect, async (req, res, next) => {
  try {
    const order = await resolveOrder(req.params.id, req.user)
    if (['Delivered', 'Cancelled'].includes(order.orderStatus)) {
      throw new ApiError(400, `This order is already ${order.orderStatus.toLowerCase()}.`)
    }
    if (order.orderStatus === 'Out for Delivery') {
      throw new ApiError(400, 'The rider is already on the way — call the restaurant to cancel.')
    }
    order.orderStatus = 'Cancelled'
    order.cancelReason = req.body.reason || 'Cancelled by customer'
    pushTimeline(order, 'Cancelled', order.cancelReason)
    await order.save()

    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded'
      await order.save()
      await Payment.create({
        order: order._id,
        user: order.user,
        method: order.paymentMethod,
        status: 'refunded',
        amount: order.total,
        cardLast4: null,
      })
    }
    await Notification.create({
      user: order.user,
      type: 'order',
      title: `Order #${order.orderNumber} cancelled`,
      message: `Your order was cancelled${order.cancelReason ? ` — ${order.cancelReason}` : ''}.`,
    })
    if (order.contact?.email) {
      sendEmail({ to: order.contact.email, ...templates.orderCancelled(order), template: 'orderCancelled' })
    }
    res.json({ order, message: 'Order cancelled.' })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Customer: reorder (push previous items into the cart) ═════════ */
router.post('/:id/reorder', protect, async (req, res, next) => {
  try {
    const order = await resolveOrder(req.params.id, req.user)
    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] })

    let added = 0
    let skipped = 0
    for (const line of order.items) {
      const menuItem = await MenuItem.findById(line.menuItem)
      if (!menuItem || !menuItem.available) {
        skipped += 1
        continue
      }
      const key = [menuItem._id, line.size || 'regular', (line.addons || []).map((a) => a.id).sort().join('+'), ''].join('|')
      const existing = cart.items.find((i) => i.key === key)
      if (existing) existing.qty = Math.min(99, existing.qty + line.qty)
      else
        cart.items.push({
          key,
          menuItem: menuItem._id,
          name: menuItem.name,
          image: menuItem.image,
          price: menuItem.price,
          qty: line.qty,
          size: line.size || 'regular',
          addons: line.addons || [],
          notes: '',
        })
      added += 1
    }
    await cart.save()
    const totals = computeTotals(cart.items, cart.coupon?.code ? cart.coupon : null)
    res.json({ cart, totals, added, skipped })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Customer: rate a delivered order ═════════ */
router.post('/:id/review', protect, async (req, res, next) => {
  try {
    const order = await resolveOrder(req.params.id, req.user)
    if (order.orderStatus !== 'Delivered') throw new ApiError(400, 'You can review an order once it has been delivered.')
    const rating = Number(req.body.rating)
    const text = String(req.body.text || '').trim()
    if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Choose a rating between 1 and 5.')
    if (text.length < 10) throw new ApiError(400, 'Tell us a little more (at least 10 characters).')

    const review = await Review.create({
      user: req.user._id,
      order: order._id,
      menuItem: req.body.menuItemId || order.items[0]?.menuItem,
      name: `${req.user.firstName} ${req.user.lastName}`,
      initials: (req.user.firstName[0] || '') + (req.user.lastName[0] || ''),
      rating,
      text,
      dish: req.body.dish || order.items[0]?.name,
      status: 'published',
    })
    order.rated = true
    await order.save()

    if (review.menuItem) {
      const agg = await Review.aggregate([
        { $match: { menuItem: new Types.ObjectId(String(review.menuItem)), status: 'published' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      if (agg[0]) {
        await MenuItem.findByIdAndUpdate(review.menuItem, {
          rating: Math.round(agg[0].avg * 10) / 10,
          reviewCount: agg[0].count,
        })
      }
    }
    res.status(201).json({ review })
  } catch (e) {
    next(e)
  }
})

async function resolveOrder(idOrNumber, user) {
  const byNumber = Number(idOrNumber)
  const query = Number.isFinite(byNumber) ? { orderNumber: byNumber } : { _id: idOrNumber }
  const order = await Order.findOne(query)
  if (!order) throw new ApiError(404, 'Order not found.')
  const isOwner = order.user?.toString() === user._id.toString()
  if (!isOwner && user.role !== 'admin') throw new ApiError(403, 'You cannot view this order.')
  return order
}

export function toTrackingPayload(order) {
  const stage =
    order.orderStatus === 'Cancelled'
      ? 'cancelled'
      : { Pending: 0, Confirmed: 1, Preparing: 2, Ready: 2, 'Out for Delivery': 3, Delivered: 4 }[order.orderStatus] ?? 0
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    stage,
    etaMinutes: order.etaMinutes,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    contact: order.contact,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.unitPrice ?? i.price ?? 0,
      image: i.image,
      size: i.size,
      addons: i.addons,
    })),
    // Back-compat for UI shape
    number: order.orderNumber,
    address:
      order.fulfillment === 'pickup'
        ? 'Pickup · 12 Hillview Road, F-7 Markaz, Islamabad'
        : [order.deliveryAddress?.line, order.deliveryAddress?.city, order.deliveryAddress?.postal].filter(Boolean).join(', '),
  }
}

export default router

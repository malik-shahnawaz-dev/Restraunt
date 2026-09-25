import { Router } from 'express'
import {
  Order,
  Cart,
  MenuItem,
  Coupon,
  Payment,
  Notification,
  Setting,
  nextOrderNumber,
} from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { computeTotals, chargePayment, sizeDelta } from '../utils/pricing.js'
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

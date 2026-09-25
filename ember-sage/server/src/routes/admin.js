import { Router } from 'express'
import {
  Notification,
  User,
  Order,
  Reservation,
  Review,
  Coupon,
  Setting,
  MenuItem,
  Category,
  Payment,
} from '../models/index.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { sendEmail, templates } from '../utils/email.js'

const router = Router()
router.use(protect)

/* ═════════ Notifications (any signed-in user) ═════════ */
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30)
    res.json({ notifications, unread: notifications.filter((n) => !n.read).length })
  } catch (e) {
    next(e)
  }
})

router.patch('/notifications/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true })
    res.json({ message: 'All read' })
  } catch (e) {
    next(e)
  }
})

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true })
    res.json({ message: 'Read' })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Admin only below ═════════ */
router.use(adminOnly)

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

router.get('/stats', async (_req, res, next) => {
  try {
    const today = startOfToday()
    const [todayOrders, todayAgg, pending, totalCustomers, recentOrders, popular, byCategory, payments] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: today }, orderStatus: { $ne: 'Cancelled' } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: today }, orderStatus: { $ne: 'Cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$total' } } },
        ]),
        Order.countDocuments({ orderStatus: { $in: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery'] } }),
        User.countDocuments({ role: 'customer' }),
        Order.find().sort({ createdAt: -1 }).limit(8),
        MenuItem.find().sort({ reviewCount: -1 }).limit(5),
        MenuItem.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
        ]),
        Payment.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(100),
      ])

    // Revenue + orders series for last 7 days
    const days = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - i)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      days.push({ start, end, label: start.toLocaleDateString('en-US', { weekday: 'short' }) })
    }
    const inRange = await Order.find({
      createdAt: { $gte: days[0].start, $lt: days[6].end },
      orderStatus: { $ne: 'Cancelled' },
    })
    const revenueSeries = days.map((d) => ({
      label: d.label,
      revenue: Math.round(inRange.filter((o) => o.createdAt >= d.start && o.createdAt < d.end).reduce((s, o) => s + o.total, 0)),
      orders: inRange.filter((o) => o.createdAt >= d.start && o.createdAt < d.end).length,
    }))

    const categoryMeta = { burgers: 'Burgers', pizza: 'Pizza', pasta: 'Pasta', mains: 'Mains', starters: 'Starters', seafood: 'Seafood', desserts: 'Desserts', drinks: 'Drinks' }
    const palette = ['#C0522F', '#5F6F45', '#17140F', '#B07D2A', '#8C8375', '#E7DCC9', '#A34426', '#4A5736']
    const totalCatItems = byCategory.reduce((s, c) => s + c.docs.length, 0) || 1
    const ordersByCategory = byCategory
      .sort((a, b) => b.docs.length - a.docs.length)
      .map((c, i) => ({
        name: categoryMeta[c._id] || c._id,
        value: Math.max(4, Math.round((c.docs.length / totalCatItems) * 100)),
        color: palette[i % palette.length],
      }))

    res.json({
      todayOrders,
      todayRevenue: Math.round((todayAgg[0]?.revenue || 0) * 100) / 100,
      pendingOrders: pending,
      totalCustomers,
      revenueSeries,
      ordersSeries: revenueSeries,
      popularDishes: popular.map((p, i) => ({
        name: p.name,
        orders: p.reviewCount,
        pct: Math.max(20, Math.round((p.reviewCount / (popular[0]?.reviewCount || 1)) * 100)),
        rank: i + 1,
      })),
      ordersByCategory,
      recentOrders: recentOrders.map((o) => ({
        id: String(o.orderNumber),
        customer: o.contact?.name || 'Customer',
        items: o.items.reduce((s, i) => s + i.qty, 0),
        amount: o.total,
        payment: o.paymentStatus === 'paid' ? 'Paid' : o.paymentMethod === 'cod' ? 'COD' : o.paymentStatus === 'failed' ? 'Failed' : 'Pending',
        status: o.orderStatus,
        date: new Date(o.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      })),
      paidPayments: payments.length,
    })
  } catch (e) {
    next(e)
  }
})

/* ——— Orders admin ——— */
router.get('/orders', async (req, res, next) => {
  try {
    const q = {}
    if (req.query.status && req.query.status !== 'all') q.orderStatus = req.query.status
    if (req.query.q) q['contact.name'] = new RegExp(req.query.q, 'i')
    const orders = await Order.find(q).sort({ createdAt: -1 }).limit(100)
    res.json({
      orders: orders.map((o) => ({
        id: String(o.orderNumber),
        _id: o._id,
        customer: o.contact?.name || 'Customer',
        email: o.contact?.email,
        phone: o.contact?.phone,
        items: o.items.reduce((s, i) => s + i.qty, 0),
        itemLines: o.items.map((i) => `${i.qty} × ${i.name}`),
        amount: o.total,
        payment: o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus === 'failed' ? 'Failed' : o.paymentMethod === 'cod' ? 'COD' : 'Pending',
        paymentStatus: o.paymentStatus,
        status: o.orderStatus,
        fulfillment: o.fulfillment,
        date: new Date(o.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        createdAt: o.createdAt,
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body
    const allowed = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled']
    if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status.')
    const order = await Order.findOne({ orderNumber: Number(req.params.id) })
    if (!order) throw new ApiError(404, 'Order not found.')
    order.orderStatus = status
    if (status === 'Delivered') order.etaMinutes = 0
    await order.save()

    if (order.user) {
      await Notification.create({
        user: order.user,
        type: 'order',
        title: `Order #${order.orderNumber} — ${status}`,
        message:
          status === 'Delivered'
            ? 'Your order has been delivered. Enjoy your meal!'
            : `Status update: your order is now ${status.toLowerCase()}.`,
      })
      if (order.contact?.email) {
        sendEmail({
          to: order.contact.email,
          ...(status === 'Delivered' ? templates.orderDelivered(order) : templates.orderStatus(order)),
          template: status === 'Delivered' ? 'delivered' : 'status',
        })
      }
    }
    res.json({ order })
  } catch (e) {
    next(e)
  }
})

/* ——— Customers ——— */
router.get('/customers', async (req, res, next) => {
  try {
    const q = {}
    if (req.query.status && req.query.status !== 'all') q.status = req.query.status
    if (req.query.q) {
      q.$or = [{ firstName: new RegExp(req.query.q, 'i') }, { lastName: new RegExp(req.query.q, 'i') }, { email: new RegExp(req.query.q, 'i') }]
    }
    const users = await User.find({ role: { $ne: 'admin' } }).select('-passwordHash').sort({ createdAt: -1 }).limit(200)
    const orders = await Order.find({ user: { $in: users.map((u) => u._id) } })
    const enriched = users.map((u) => {
      const mine = orders.filter((o) => o.user?.toString() === u._id.toString() && o.orderStatus !== 'Cancelled')
      const spent = mine.reduce((s, o) => s + o.total, 0)
      const active = mine.filter((o) => ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery'].includes(o.orderStatus)).length
      let status = 'Inactive'
      if (spent >= 1500) status = 'VIP'
      else if (active > 0) status = 'Preparing'
      else if (mine.length >= 3) status = 'Active'
      else if (mine.length > 0) status = 'Active'
      else if (Date.now() - new Date(u.createdAt).getTime() < 7 * 864e5) status = 'New'
      if (q.status && status !== q.status) return null
      if (req.query.q && !(`${u.firstName} ${u.lastName}`.toLowerCase().includes(req.query.q.toLowerCase()) || u.email.includes(req.query.q.toLowerCase()))) return null
      return {
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        phone: u.phone,
        orders: mine.length,
        spent: Math.round(spent * 100) / 100,
        joined: new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status,
      }
    }).filter(Boolean)
    res.json({ customers: enriched, total: enriched.length })
  } catch (e) {
    next(e)
  }
})

/* ——— Reservations admin ——— */
router.get('/reservations', async (_req, res, next) => {
  try {
    const reservations = await Reservation.find().sort({ createdAt: -1 }).limit(100)
    res.json({
      reservations: reservations.map((r) => ({
        id: `R-${String(r._id).slice(-4).toUpperCase()}`,
        _id: r._id,
        name: r.name,
        email: r.email,
        guests: r.guests,
        date: r.date,
        time: r.time,
        notes: r.notes || '—',
        status: r.status,
      })),
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/reservations/:id', async (req, res, next) => {
  try {
    const r = await Reservation.findById(req.params.id)
    if (!r) throw new ApiError(404, 'Reservation not found.')
    if (req.body.status) r.status = req.body.status
    await r.save()
    if (r.user && req.body.status) {
      await Notification.create({
        user: r.user,
        type: 'reservation',
        title: `Reservation ${req.body.status}`,
        message: `Your table on ${r.date} at ${r.time} is now ${req.body.status.toLowerCase()}.`,
      })
    }
    res.json({ reservation: r })
  } catch (e) {
    next(e)
  }
})

/* ——— Reviews admin ——— */
router.get('/reviews', async (_req, res, next) => {
  try {
    const reviews = await Review.find().sort({ date: -1 }).limit(100)
    res.json({ reviews })
  } catch (e) {
    next(e)
  }
})

router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) throw new ApiError(404, 'Review not found.')
    if (req.body.status) review.status = req.body.status
    if (req.body.reply) review.reply = req.body.reply
    await review.save()
    res.json({ review })
  } catch (e) {
    next(e)
  }
})

/* ——— Coupons admin ——— */
router.get('/coupons', async (_req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json({ coupons })
  } catch (e) {
    next(e)
  }
})

router.post('/coupons', async (req, res, next) => {
  try {
    const { code, type, value, minOrder, usageLimit, active, label } = req.body
    if (!code || !type) throw new ApiError(400, 'Code and type are required.')
    const coupon = await Coupon.create({
      code: String(code).toUpperCase().trim(),
      type,
      value: Number(value) || 0,
      minOrder: Number(minOrder) || 0,
      usageLimit: Number(usageLimit) || 1000,
      active: active !== false,
      label: label || undefined,
    })
    res.status(201).json({ coupon })
  } catch (e) {
    next(e)
  }
})

router.patch('/coupons/:id', async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) throw new ApiError(404, 'Coupon not found.')
    Object.assign(coupon, {
      ...(req.body.type && { type: req.body.type }),
      ...(req.body.value != null && { value: Number(req.body.value) }),
      ...(req.body.minOrder != null && { minOrder: Number(req.body.minOrder) }),
      ...(req.body.usageLimit != null && { usageLimit: Number(req.body.usageLimit) }),
      ...(req.body.active != null && { active: Boolean(req.body.active) }),
      ...(req.body.label != null && { label: req.body.label }),
    })
    await coupon.save()
    res.json({ coupon })
  } catch (e) {
    next(e)
  }
})

router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await Coupon.deleteOne({ _id: req.params.id })
    res.json({ message: 'Coupon deleted' })
  } catch (e) {
    next(e)
  }
})

/* ——— Settings admin ——— */
router.patch('/settings', async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ key: 'restaurant' })
    if (!settings) settings = new Setting({ key: 'restaurant' })
    const allowed = ['name', 'tagline', 'phone', 'email', 'address', 'hours', 'openToday', 'acceptOrders', 'autoConfirm', 'codEnabled', 'maintenance', 'freeDeliveryThreshold', 'deliveryFee', 'taxRate']
    for (const k of allowed) if (req.body[k] !== undefined) settings[k] = req.body[k]
    await settings.save()
    res.json({ settings })
  } catch (e) {
    next(e)
  }
})

/* ——— Dashboard helpers ——— */
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 })
    res.json({ categories })
  } catch (e) {
    next(e)
  }
})

router.get('/dashboard-orders', async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(8)
    res.json({ orders })
  } catch (e) {
    next(e)
  }
})

export default router

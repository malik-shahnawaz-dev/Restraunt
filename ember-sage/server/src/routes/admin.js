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
  Address,
  ContactMessage,
  pushTimeline,
  tierFor,
} from '../models/index.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { sendEmail, templates } from '../utils/email.js'
import { logAudit } from '../utils/audit.js'

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
    await logAudit(req, 'status', 'order', `Order #${order.orderNumber} → ${req.body.status}`, order._id)
    order.orderStatus = status
    if (status === 'Delivered') order.etaMinutes = 0
    pushTimeline(order, status)
    await order.save()

    // Loyalty: award points when an order completes
    if (status === 'Delivered' && order.user && order.paymentStatus !== 'refunded') {
      const customer = await User.findById(order.user)
      if (customer) {
        const points = Math.round(order.total || 0)
        const lifetimeSpend = Number((customer.loyalty?.lifetimeSpend || 0) + (order.total || 0))
        customer.loyalty = {
          points: (customer.loyalty?.points || 0) + points,
          tier: tierFor((customer.loyalty?.points || 0) + points),
          lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
          ordersCompleted: (customer.loyalty?.ordersCompleted || 0) + 1,
          streak: (customer.loyalty?.streak || 0) + 1,
          lastOrderAt: new Date(),
        }
        await customer.save()
      }
    }

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
    await logAudit(req, 'status', 'reservation', `Reservation for ${r.name} → ${r.status}`, r._id)
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
    if (req.body.featured != null) review.featured = Boolean(req.body.featured)
    if (req.body.reply) review.reply = req.body.reply
    await review.save()
    await logAudit(req, 'moderate', 'review', `Review by ${review.name} → ${review.status}`, review._id)
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
    await logAudit(req, 'create', 'coupon', `Created coupon ${coupon.code}`, coupon._id)
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
    await logAudit(req, 'update', 'coupon', `Updated coupon ${coupon.code}`, coupon._id)
    res.json({ coupon })
  } catch (e) {
    next(e)
  }
})

router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await Coupon.deleteOne({ _id: req.params.id })
    await logAudit(req, 'delete', 'coupon', `Deleted coupon`, req.params.id)
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
    await logAudit(req, 'update', 'settings', 'Updated restaurant settings', settings._id)
    res.json({ settings })
  } catch (e) {
    next(e)
  }
})

/* ——— Customer detail ——— */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id).select('-passwordHash -resetToken')
    if (!customer) throw new ApiError(404, 'Customer not found.')
    const [orders, addresses, favorites] = await Promise.all([
      Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(50),
      Address.find({ user: customer._id }),
      MenuItem.find({ _id: { $in: customer.favorites || [] } }),
    ])
    const live = orders.filter((o) => o.orderStatus !== 'Cancelled')
    const spent = live.reduce((sum, o) => sum + (o.total || 0), 0)
    res.json({
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        joined: customer.createdAt,
        lastLoginAt: customer.lastLoginAt,
        loyalty: customer.loyalty,
        preferences: customer.preferences,
        orders: live.length,
        spent: Math.round(spent * 100) / 100,
      },
      orders: orders.map((o) => ({
        id: String(o.orderNumber),
        _id: o._id,
        total: o.total,
        status: o.orderStatus,
        payment: o.paymentStatus,
        fulfillment: o.fulfillment,
        items: o.items.reduce((s, i) => s + i.qty, 0),
        date: o.createdAt,
      })),
      addresses,
      favorites,
    })
  } catch (e) {
    next(e)
  }
})

/* ——— Refund a payment ——— */
router.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const order = await Order.findOne({ orderNumber: Number(req.params.id) })
    if (!order) throw new ApiError(404, 'Order not found.')
    if (order.paymentStatus !== 'paid') throw new ApiError(400, 'Only paid orders can be refunded.')
    order.paymentStatus = 'refunded'
    pushTimeline(order, 'Refunded', req.body.reason || 'Refunded by admin')
    await order.save()
    await Payment.create({
      order: order._id,
      user: order.user,
      method: order.paymentMethod,
      status: 'refunded',
      amount: order.total,
    })
    if (order.user) {
      await Notification.create({
        user: order.user,
        type: 'payment',
        title: `Refund issued for #${order.orderNumber}`,
        message: `$${order.total.toFixed(2)} is on its way back to your card.`,
      })
    }
    await logAudit(req, 'refund', 'order', `Refunded order #${order.orderNumber}`, order._id)
    res.json({ order })
  } catch (e) {
    next(e)
  }
})

/* ——— Live analytics ——— */
router.get('/analytics', async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30))
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))

    const orders = await Order.find({ createdAt: { $gte: since } })
    const live = orders.filter((o) => o.orderStatus !== 'Cancelled')

    // daily buckets
    const buckets = []
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - i)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const inDay = live.filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) < end)
      buckets.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(inDay.reduce((s, o) => s + (o.total || 0), 0) * 100) / 100,
        orders: inDay.length,
      })
    }

    // dish leaderboard from real order lines
    const dishMap = new Map()
    for (const order of live) {
      for (const line of order.items || []) {
        const key = line.name
        const entry = dishMap.get(key) || { name: key, orders: 0, revenue: 0 }
        entry.orders += line.qty || 1
        entry.revenue += (line.unitPrice || 0) * (line.qty || 1)
        dishMap.set(key, entry)
      }
    }
    const topDishes = [...dishMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 6)
    const dishMax = topDishes[0]?.orders || 1

    // category split
    const categories = await Category.find().sort({ sortOrder: 1 })
    const menu = await MenuItem.find()
    const categoryName = new Map(menu.map((m) => [String(m._id), m.category]))
    const palette = ['#C0522F', '#5F6F45', '#17140F', '#B07D2A', '#8C8375', '#A34426', '#4A5736', '#E7DCC9']
    const catMap = new Map()
    for (const order of live) {
      for (const line of order.items || []) {
        const cat = categoryName.get(String(line.menuItem)) || 'other'
        catMap.set(cat, (catMap.get(cat) || 0) + (line.qty || 1))
      }
    }
    const catTotal = [...catMap.values()].reduce((s, v) => s + v, 0) || 1
    const ordersByCategory = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count], i) => ({
        name: categories.find((c) => c.slug === slug)?.name || slug,
        value: Math.round((count / catTotal) * 100),
        color: palette[i % palette.length],
      }))

    // payment mix + fulfillment split + peak hours
    const countBy = (list, key) =>
      list.reduce((acc, item) => {
        acc[item[key]] = (acc[item[key]] || 0) + 1
        return acc
      }, {})

    const hours = Array.from({ length: 12 }, (_, i) => i + 11) // 11:00 → 22:00
    const peakHours = hours.map((hour) => ({
      label: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'am' : 'pm'}`,
      orders: live.filter((o) => new Date(o.createdAt).getHours() === hour).length,
    }))

    const revenue = live.reduce((s, o) => s + (o.total || 0), 0)
    const [customerCount, newCustomers, allOrders, menuCount, reservationCount, reviewAgg] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: since } }),
      Order.countDocuments(),
      MenuItem.countDocuments(),
      Reservation.countDocuments(),
      Review.aggregate([{ $match: { status: 'published' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ])

    res.json({
      range: days,
      revenueSeries: buckets,
      ordersSeries: buckets,
      peakHours,
      topDishes: topDishes.map((d, i) => ({
        name: d.name,
        orders: d.orders,
        revenue: Math.round(d.revenue * 100) / 100,
        pct: Math.round((d.orders / dishMax) * 100),
        rank: i + 1,
      })),
      ordersByCategory,
      paymentMix: countBy(live, 'paymentMethod'),
      fulfillmentMix: countBy(live, 'fulfillment'),
      statusMix: countBy(orders, 'orderStatus'),
      summary: {
        revenue: Math.round(revenue * 100) / 100,
        orders: live.length,
        cancelled: orders.length - live.length,
        avgOrderValue: live.length ? Math.round((revenue / live.length) * 100) / 100 : 0,
        customers: customerCount,
        newCustomers,
        allOrders,
        menuCount,
        reservations: reservationCount,
        rating: Math.round((reviewAgg[0]?.avg || 0) * 10) / 10,
        reviews: reviewAgg[0]?.count || 0,
      },
    })
  } catch (e) {
    next(e)
  }
})

/* ───────────────────────── Contact inbox ───────────────────────── */
router.get('/messages', adminOnly, async (req, res, next) => {
  try {
    const status = req.query.status
    const filter = status && status !== 'all' ? { status } : {}
    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200)
    const counts = await ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    const byStatus = counts.reduce((acc, row) => ({ ...acc, [row._id || 'new']: row.count }), {})
    res.json({
      messages,
      unread: messages.filter((m) => m.status === 'new').length,
      counts: byStatus,
    })
  } catch (e) {
    next(e)
  }
})

router.patch('/messages/:id', adminOnly, async (req, res, next) => {
  try {
    const message = await ContactMessage.findById(req.params.id)
    if (!message) throw new ApiError(404, 'Message not found.')
    const { status } = req.body
    if (status && !['new', 'read', 'archived'].includes(status)) throw new ApiError(400, 'Unknown status.')
    if (status) message.status = status
    if (message.status !== 'new' && !message.handledBy) message.handledBy = req.user?.firstName || 'Admin'
    await message.save()
    res.json({ message })
  } catch (e) {
    next(e)
  }
})

router.delete('/messages/:id', adminOnly, async (req, res, next) => {
  try {
    const message = await ContactMessage.findById(req.params.id)
    if (!message) throw new ApiError(404, 'Message not found.')
    await message.deleteOne()
    await logAudit(req, 'delete', 'message', `Deleted enquiry from ${message.email}`, message._id)
    res.json({ message: 'Message deleted' })
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

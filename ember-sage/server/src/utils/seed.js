import 'dotenv/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import {
  User,
  Address,
  Category,
  MenuItem,
  Coupon,
  Review,
  Reservation,
  Order,
  Payment,
  Notification,
  Setting,
  Counter,
  Content,
  GalleryImage,
  Faq,
  Subscriber,
  MediaAsset,
  AuditLog,
  nextOrderNumber,
  pushTimeline,
  tierFor,
} from '../models/index.js'
import { CATEGORIES, MENU_ITEMS, COUPONS } from '../../../src/data/menu.js'
import { REVIEWS } from '../../../src/data/site.js'
import { DEFAULT_CONTENT, DEFAULT_GALLERY, DEFAULT_FAQS } from './defaultContent.js'
import { computeTotals } from './pricing.js'
import { sendEmail, templates } from './email.js'
import { connectDB, disconnectDB } from '../config/db.js'

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const SETTINGS_DEFAULTS = {
  key: 'restaurant',
  name: 'Ember & Sage',
  tagline: 'Good Food. Good Mood.',
  phone: '+92 51 234 5678',
  email: 'hello@emberandsage.pk',
  address: '12 Hillview Road, F-7 Markaz, Islamabad',
  hours: [
    { days: 'Monday – Thursday', time: '11:00 AM – 11:00 PM' },
    { days: 'Friday – Saturday', time: '11:00 AM – 12:30 AM' },
    { days: 'Sunday', time: '12:00 PM – 11:00 PM' },
  ],
  openToday: '11:00 AM – 11:00 PM',
  acceptOrders: true,
  autoConfirm: true,
  codEnabled: true,
  maintenance: false,
  freeDeliveryThreshold: 50,
  deliveryFee: 3.5,
  taxRate: 0.1,
}

/**
 * Idempotent bootstrap: creates the demo restaurant (menu, customers, orders,
 * reservations, reviews, CMS content, gallery, FAQs…) the first time the API
 * starts against an empty database.
 *
 * SEED=force-clear npm run db:reset  → wipe everything and reseed.
 */
export async function runSeed() {
  if (process.env.SEED === 'force-clear') {
    await Promise.all(
      [User, Address, Category, MenuItem, Coupon, Review, Reservation, Order, Payment, Notification, Setting, Counter, Content, GalleryImage, Faq, Subscriber, MediaAsset, AuditLog].map(
        (m) => m.deleteMany({}),
      ),
    )
    console.log('[seed] database cleared')
  }

  const userCount = await User.countDocuments()
  if (userCount > 0 && process.env.SEED !== 'force') {
    console.log('[seed] already seeded — skipping')
    return
  }
  console.log('[seed] seeding database…')

  /* ─────────── Settings ─────────── */
  let settings = await Setting.findOne({ key: 'restaurant' })
  if (!settings) settings = await Setting.create(SETTINGS_DEFAULTS)
  else Object.assign(settings, { ...SETTINGS_DEFAULTS, hours: settings.hours?.length ? settings.hours : SETTINGS_DEFAULTS.hours }), await settings.save()

  /* ─────────── Users ─────────── */
  const password = await bcrypt.hash('Password123!', 10)
  const admin =
    (await User.findOne({ email: 'admin@ember.pk' })) ||
    (await User.create({
      firstName: 'Ammaar',
      lastName: 'Rehman',
      email: 'admin@ember.pk',
      phone: '+92 300 1112223',
      passwordHash: password,
      role: 'admin',
    }))

  const demo =
    (await User.findOne({ email: 'demo@ember.pk' })) ||
    (await User.create({
      firstName: 'Ayesha',
      lastName: 'Khan',
      email: 'demo@ember.pk',
      phone: '+92 300 1234567',
      passwordHash: password,
      role: 'customer',
      favorites: [],
      paymentMethods: [{ brand: 'Visa', last4: '4242', expMonth: '09', expYear: '28', holder: 'AYESHA KHAN', isDefault: true }],
    }))

  const customerNames = [
    ['Hira', 'Malik', 'hira.m@gmail.com'], ['Zain', 'Abbas', 'zain.abbas@outlook.com'],
    ['Noor', 'Hassan', 'noor.hassan@gmail.com'], ['Ali', 'Raza', 'ali.raza@yahoo.com'],
    ['Mehwish', 'Noor', 'm.noor@gmail.com'], ['Usman', 'Tariq', 'usman.t@proton.me'],
    ['Fatima', 'Zahra', 'fatima.z@gmail.com'], ['Bilal', 'Ahmed', 'bilal.a@hotmail.com'],
    ['Sana', 'Iqbal', 'sana.i@gmail.com'], ['Hamza', 'Sheikh', 'hamza.s@gmail.com'],
  ]
  const customers = []
  for (const [firstName, lastName, email] of customerNames) {
    customers.push(
      (await User.findOne({ email })) ||
        (await User.create({
          firstName,
          lastName,
          email,
          phone: '+92 333 ' + Math.floor(1000000 + Math.random() * 8999999),
          passwordHash: password,
        })),
    )
  }

  /* ─────────── Categories ─────────── */
  if ((await Category.countDocuments()) === 0) {
    for (const [i, c] of CATEGORIES.entries()) {
      await Category.create({ name: c.name, slug: c.id, description: c.description, image: c.image, sortOrder: i })
    }
  }

  /* ─────────── Menu items ─────────── */
  let menuDocs = await MenuItem.find()
  if (menuDocs.length === 0) {
    menuDocs = []
    for (const m of MENU_ITEMS) {
      menuDocs.push(
        await MenuItem.create({
          name: m.name,
          slug: m.id,
          category: m.category,
          price: m.price,
          rating: m.rating,
          reviewCount: m.reviews,
          prepTime: m.prepTime,
          calories: m.calories,
          image: m.image,
          description: m.description,
          longDescription: m.longDescription,
          ingredients: m.ingredients,
          allergens: m.allergens,
          tags: m.tags,
          featured: m.featured,
          available: m.available,
        }),
      )
    }
  }

  /* ─────────── Coupons ─────────── */
  if ((await Coupon.countDocuments()) === 0) {
    for (const [code, c] of Object.entries(COUPONS)) {
      await Coupon.create({
        code,
        type: c.type,
        value: c.type === 'percent' ? c.value : 0,
        minOrder: c.min || 0,
        label: c.label,
        active: true,
        usageLimit: 1000,
        used: Math.floor(Math.random() * 200),
      })
    }
    await Coupon.create({ code: 'EID2026', type: 'percent', value: 15, minOrder: 30, label: '15% off', active: false, usageLimit: 2000, used: 2000 })
  }

  /* ─────────── CMS content blocks ─────────── */
  for (const block of DEFAULT_CONTENT) {
    const existing = await Content.findOne({ key: block.key })
    if (!existing) await Content.create({ ...block, active: block.active !== false })
  }

  /* ─────────── Gallery ─────────── */
  if ((await GalleryImage.countDocuments()) === 0) {
    await GalleryImage.insertMany(DEFAULT_GALLERY)
  }

  /* ─────────── FAQs ─────────── */
  if ((await Faq.countDocuments()) === 0) {
    await Faq.insertMany(DEFAULT_FAQS)
  }

  /* ─────────── Reviews ─────────── */
  if ((await Review.countDocuments()) === 0) {
    const users = [demo, ...customers]
    for (const [i, r] of REVIEWS.entries()) {
      await Review.create({
        user: users[i % users.length]._id,
        name: r.name,
        initials: r.initials,
        rating: r.rating,
        text: r.text,
        dish: r.dish,
        menuItem: menuDocs.find((m) => m.name === r.dish)?._id,
        status: 'published',
        featured: i < 3,
        date: new Date(Date.now() - i * 864e5),
      })
    }
  }

  /* ─────────── Reservations ─────────── */
  if ((await Reservation.countDocuments()) === 0) {
    const today = new Date()
    const iso = (offset) => {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      return d.toISOString().slice(0, 10)
    }
    await Reservation.insertMany([
      { user: customers[8]?._id, name: 'Sana Iqbal', email: 'sana.i@gmail.com', phone: '+92 300 1111111', date: iso(1), time: '7:30 PM', guests: '4', notes: 'Anniversary — window table', status: 'Confirmed' },
      { user: customers[9]?._id, name: 'Hamza Sheikh', email: 'hamza.s@gmail.com', phone: '+92 321 2222222', date: iso(1), time: '8:00 PM', guests: '2', notes: '', status: 'Pending' },
      { name: 'Liba Aslam', email: 'liba@gmail.com', phone: '+92 333 3333333', date: iso(2), time: '8:30 PM', guests: '8', notes: 'Birthday cake requested', status: 'Confirmed' },
      { name: 'Omar Raza', email: 'omar@gmail.com', phone: '+92 301 4444444', date: iso(0), time: '6:00 PM', guests: '3', notes: 'Nut allergy', status: 'Pending' },
      { user: demo._id, name: 'Ayesha Khan', email: 'demo@ember.pk', phone: '+92 300 1234567', date: iso(-1), time: '9:00 PM', guests: '2', notes: '', status: 'Seated' },
      { user: demo._id, name: 'Ayesha Khan', email: 'demo@ember.pk', phone: '+92 300 1234567', date: iso(3), time: '8:00 PM', guests: '5', notes: 'Family dinner', status: 'Pending' },
    ])
  }

  /* ─────────── Addresses for demo user ─────────── */
  if ((await Address.countDocuments({ user: demo._id })) === 0) {
    await Address.insertMany([
      { user: demo._id, label: 'Home', line: 'House 42, Street 18, Sector F-8/2', city: 'Islamabad', postal: '44000', phone: '+92 300 1234567', isDefault: true },
      { user: demo._id, label: 'Work', line: 'Plot 7, Cyber Court, Blue Area', city: 'Islamabad', postal: '44000', phone: '+92 300 7654321', isDefault: false },
    ])
  }

  /* ─────────── Orders across the last 30 days (drives live analytics) ─────────── */
  if ((await Order.countDocuments()) === 0) {
    const statuses = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Preparing', 'Out for Delivery', 'Confirmed', 'Pending', 'Cancelled']
    const allCustomers = [demo, ...customers]
    let seq = 10200

    for (let d = 29; d >= 0; d--) {
      const count = d <= 6 ? 4 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        const user = allCustomers[Math.floor(Math.random() * allCustomers.length)]
        const lineCount = 1 + Math.floor(Math.random() * 3)
        const chosen = [...menuDocs].sort(() => Math.random() - 0.5).slice(0, lineCount)
        const items = chosen.map((m) => ({
          menuItem: m._id,
          name: m.name,
          image: m.image,
          unitPrice: m.price,
          qty: 1 + Math.floor(Math.random() * 2),
          size: Math.random() > 0.7 ? 'large' : 'regular',
          addons: Math.random() > 0.75 ? [{ id: 'extra-cheese', label: 'Extra Cheese', price: 2 }] : [],
          notes: '',
        }))
        const totals = computeTotals(items, null)
        const createdAt = new Date()
        createdAt.setHours(12 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 59), 0, 0)
        createdAt.setDate(createdAt.getDate() - d)

        const status = d === 0 ? statuses[i % 5] : statuses[Math.floor(Math.random() * statuses.length)]
        const method = ['card', 'online', 'cod'][Math.floor(Math.random() * 3)]
        const orderNumber = ++seq
        const delivery = Math.random() > 0.25

        const order = await Order.create({
          orderNumber,
          user: user._id,
          items,
          ...totals,
          paymentMethod: method,
          paymentStatus: status === 'Cancelled' ? 'refunded' : method === 'cod' ? 'pending' : 'paid',
          orderStatus: status,
          fulfillment: delivery ? 'delivery' : 'pickup',
          deliveryAddress: delivery ? { line: 'House 42, Street 18', city: 'Islamabad', postal: '44000', instructions: '' } : undefined,
          customerNotes: '',
          contact: { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone },
          etaMinutes: status === 'Delivered' ? 0 : 35,
          createdAt,
          updatedAt: createdAt,
          timeline: [{ status: 'Pending', at: createdAt }, { status, at: createdAt }],
        })
        if (status === 'Delivered') pushTimeline(order, 'Delivered')
        await order.save()

        await Payment.create({
          order: order._id,
          user: user._id,
          method,
          status: order.paymentStatus,
          amount: totals.total,
          cardLast4: method === 'cod' ? null : '4242',
        })
      }
    }

    await Counter.findOneAndUpdate({ key: 'orderNumber' }, { seq }, { upsert: true })
  }

  /* ─────────── Loyalty progress for seeded customers (real numbers) ─────────── */
  const deliveredOrders = await Order.find({ orderStatus: 'Delivered' })
  const spendByUser = new Map()
  for (const order of deliveredOrders) {
    const key = String(order.user)
    const current = spendByUser.get(key) || { spend: 0, orders: 0, last: null }
    current.spend += order.total || 0
    current.orders += 1
    if (!current.last || new Date(order.createdAt) > new Date(current.last)) current.last = new Date(order.createdAt)
    spendByUser.set(key, current)
  }
  for (const [userId, stats] of spendByUser) {
    const user = await User.findById(userId)
    if (!user) continue
    const points = Math.round(stats.spend)
    user.loyalty = {
      points,
      tier: tierFor(points),
      lifetimeSpend: Math.round(stats.spend * 100) / 100,
      ordersCompleted: stats.orders,
      streak: stats.orders > 5 ? 3 : 1,
      lastOrderAt: stats.last,
    }
    await user.save()
  }

  /* ─────────── Favorites + notifications for demo user ─────────── */
  if (!demo.favorites?.length) {
    demo.favorites = menuDocs.filter((m) => ['truffle-pasta', 'ribeye', 'ember-burger', 'tiramisu'].includes(m.slug)).map((m) => m._id)
    await demo.save()
  }

  if ((await Notification.countDocuments({ user: demo._id })) === 0) {
    await Notification.insertMany([
      { user: demo._id, type: 'promo', title: 'Weekend special unlocked', message: 'Use WELCOME10 for 10% off your next order.', read: false, createdAt: new Date(Date.now() - 72e5) },
      { user: demo._id, type: 'order', title: 'Order #10256 is being prepared', message: 'The kitchen has started preparing your items.', read: false, createdAt: new Date(Date.now() - 864e5) },
      { user: demo._id, type: 'payment', title: 'Payment confirmed', message: 'Your payment was received successfully.', read: true, createdAt: new Date(Date.now() - 6 * 864e5) },
    ])
  }

  /* ─────────── Newsletter subscribers ─────────── */
  if ((await Subscriber.countDocuments()) === 0) {
    await Subscriber.insertMany([
      { email: 'ayesha.k@gmail.com', source: 'footer' },
      { email: 'foodie.isb@gmail.com', source: 'footer' },
      { email: 'usman.t@proton.me', source: 'checkout' },
    ])
  }

  /* ─────────── Audit log seeding (so the panel is never empty) ─────────── */
  if ((await AuditLog.countDocuments()) === 0) {
    await AuditLog.create({ actor: admin._id, actorName: `${admin.firstName} ${admin.lastName}`, action: 'seed', entity: 'system', summary: 'Restaurant database seeded with demo content' })
  }

  /* ─────────── Welcome email (lands in the dev outbox) ─────────── */
  sendEmail({ to: demo.email, ...templates.welcome(demo), template: 'welcome' })

  console.log(
    `[seed] done — users: ${await User.countDocuments()} | dishes: ${await MenuItem.countDocuments()} | orders: ${await Order.countDocuments()} | content blocks: ${await Content.countDocuments()} | gallery: ${await GalleryImage.countDocuments()}`,
  )
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) {
  try {
    await connectDB()
    await runSeed()
    await disconnectDB()
    process.exit(0)
  } catch (error) {
    console.error('[seed] failed:', error)
    process.exit(1)
  }
}

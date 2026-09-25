import bcrypt from 'bcryptjs'
import {
  User, Category, MenuItem, Coupon, Review, Reservation, Order, Notification, Setting, Counter, Payment,
  nextOrderNumber,
} from '../models/index.js'
import { CATEGORIES, MENU_ITEMS, COUPONS } from '../../../src/data/menu.js'
import { REVIEWS } from '../../../src/data/site.js'
import { computeTotals } from './pricing.js'
import { sendEmail, templates } from './email.js'

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export async function runSeed() {
  if (process.env.SEED === 'force-clear') {
    await Promise.all([User, Category, MenuItem, Coupon, Review, Reservation, Order, Notification, Setting, Payment, Counter].map((m) => m.deleteMany({})))
  }

  const userCount = await User.countDocuments()
  if (userCount > 0) {
    console.log('[seed] already seeded — skipping')
    return
  }
  console.log('[seed] seeding database…')

  /* ——— Settings ——— */
  await Setting.create({
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
  })

  /* ——— Users ——— */
  const password = await bcrypt.hash('Password123!', 10)
  const admin = await User.create({
    firstName: 'Ammaar',
    lastName: 'Rehman',
    email: 'admin@ember.pk',
    phone: '+92 300 1112223',
    passwordHash: password,
    role: 'admin',
  })
  const demo = await User.create({
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'demo@ember.pk',
    phone: '+92 300 1234567',
    passwordHash: password,
    role: 'customer',
    favorites: [],
    paymentMethods: [{ brand: 'Visa', last4: '4242', expMonth: '09', expYear: '28', holder: 'AYESHA KHAN', isDefault: true }],
  })

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
      await User.create({ firstName, lastName, email, phone: '+92 333 ' + Math.floor(1000000 + Math.random() * 8999999), passwordHash: password }),
    )
  }

  /* ——— Categories ——— */
  for (const [i, c] of CATEGORIES.entries()) {
    await Category.create({
      name: c.name,
      slug: c.id,
      description: c.description,
      image: c.image,
      sortOrder: i,
    })
  }

  /* ——— Menu items ——— */
  const menuDocs = []
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

  /* ——— Coupons ——— */
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

  /* ——— Reviews ——— */
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
      date: new Date(Date.now() - i * 864e5),
    })
  }

  /* ——— Reservations ——— */
  await Reservation.insertMany([
    { name: 'Sana Iqbal', email: 'sana.i@gmail.com', phone: '+92 300 1111111', date: '2026-09-24', time: '7:30 PM', guests: '4', notes: 'Anniversary — window table', status: 'Confirmed' },
    { name: 'Hamza Sheikh', email: 'hamza.s@gmail.com', phone: '+92 321 2222222', date: '2026-09-24', time: '8:00 PM', guests: '2', notes: '', status: 'Pending' },
    { name: 'Liba Aslam', email: 'liba@gmail.com', phone: '+92 333 3333333', date: '2026-09-25', time: '8:30 PM', guests: '8', notes: 'Birthday cake requested', status: 'Confirmed' },
    { name: 'Omar Raza', email: 'omar@gmail.com', phone: '+92 301 4444444', date: '2026-09-25', time: '6:00 PM', guests: '3', notes: 'Nut allergy', status: 'Pending' },
    { name: 'Ayesha Noor', email: 'ayesha.n@gmail.com', phone: '+92 345 5555555', date: '2026-09-23', time: '9:00 PM', guests: '2', notes: '', status: 'Seated' },
  ])

  /* ——— Addresses for demo user ——— */
  const { Address } = await import('../models/index.js')
  await Address.insertMany([
    { user: demo._id, label: 'Home', line: 'House 42, Street 18, Sector F-8/2', city: 'Islamabad', postal: '44000', phone: '+92 300 1234567', isDefault: true },
    { user: demo._id, label: 'Work', line: 'Plot 7, Cyber Court, Blue Area', city: 'Islamabad', postal: '44000', phone: '+92 300 7654321', isDefault: false },
  ])

  /* ——— Orders across last 7 days (drives live analytics) ——— */
  const statuses = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Preparing', 'Out for Delivery', 'Confirmed', 'Pending', 'Cancelled']
  const allCustomers = [demo, ...customers]
  let orderSeq = 10200

  for (let d = 6; d >= 0; d--) {
    const count = d <= 2 ? 6 : 4
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
      const orderNumber = ++orderSeq

      const order = await Order.create({
        orderNumber,
        user: user._id,
        items,
        ...totals,
        paymentMethod: method,
        paymentStatus: status === 'Cancelled' ? 'refunded' : method === 'cod' ? 'pending' : 'paid',
        orderStatus: status,
        fulfillment: Math.random() > 0.25 ? 'delivery' : 'pickup',
        deliveryAddress: { line: 'House 42, Street 18', city: 'Islamabad', postal: '44000', instructions: '' },
        customerNotes: '',
        contact: { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone },
        etaMinutes: status === 'Delivered' ? 0 : 35,
        createdAt,
        updatedAt: createdAt,
      })
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
  await Counter.findOneAndUpdate({ key: 'orderNumber' }, { seq: orderSeq }, { upsert: true })

  /* ——— Favorites + notifications for demo user ——— */
  demo.favorites = menuDocs.filter((m) => ['truffle-pasta', 'ribeye', 'ember-burger', 'tiramisu'].includes(m.slug)).map((m) => m._id)
  await demo.save()

  await Notification.insertMany([
    { user: demo._id, type: 'promo', title: 'Weekend special unlocked', message: 'Use WELCOME10 for 10% off your next order.', read: false, createdAt: new Date(Date.now() - 72e5) },
    { user: demo._id, type: 'order', title: 'Order #10256 is being prepared', message: 'The kitchen has started preparing your items.', read: false, createdAt: new Date(Date.now() - 864e5) },
    { user: demo._id, type: 'payment', title: 'Payment confirmed', message: 'Your payment was received successfully.', read: true, createdAt: new Date(Date.now() - 6 * 864e5) },
  ])

  /* ——— Welcome emails (land in dev outbox) ——— */
  sendEmail({ to: demo.email, ...templates.welcome(demo), template: 'welcome' })

  console.log('[seed] done — users:', await User.countDocuments(), '| dishes:', await MenuItem.countDocuments(), '| orders:', await Order.countDocuments())
}

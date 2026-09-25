/**
 * api.test.mjs — end-to-end test of the whole HTTP API.
 *
 *   npm run test:api            (expects `npm run dev` to be running)
 *   API_URL=http://localhost:4000 npm run test:api
 *
 * Exercises the customer journey (browse → cart → coupon → checkout → track →
 * cancel/reorder → review), the account surfaces, and the full admin CMS.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '')

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n\x1b[36m${title}\x1b[0m`)
}

/** Minimal cookie-jar client. */
class Client {
  constructor(base) {
    this.base = base
    this.cookies = new Map()
  }

  async request(method, url, { body, formData, expected = [200, 201] } = {}) {
    const headers = {}
    if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    let payload
    const isForm = formData || (typeof FormData !== 'undefined' && body instanceof FormData)
    if (isForm) payload = formData || body
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const res = await fetch(`${this.base}${url}`, { method, headers, body: payload })
    const setCookie = res.headers.getSetCookie?.() || []
    for (const raw of setCookie) {
      const [pair] = raw.split(';')
      const index = pair.indexOf('=')
      if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
    }
    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }
    if (!expected.includes(res.status)) {
      const error = new Error(`${method} ${url} → ${res.status}: ${data?.message || text.slice(0, 160)}`)
      error.status = res.status
      error.data = data
      throw error
    }
    return data
  }

  get(url, opts) {
    return this.request('GET', url, opts)
  }
  post(url, body, opts) {
    return this.request('POST', url, { ...opts, body })
  }
  patch(url, body, opts) {
    return this.request('PATCH', url, { ...opts, body })
  }
  put(url, body, opts) {
    return this.request('PUT', url, { ...opts, body })
  }
  del(url, body, opts) {
    return this.request('DELETE', url, { ...opts, body })
  }
  upload(url, formData, method = 'POST') {
    return this.request(method, url, { formData })
  }
  clear() {
    this.cookies.clear()
  }
}

const api = new Client(`${BASE}/api`)
const stamp = Date.now().toString().slice(-6)
const customer = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: `ada.${stamp}@example.com`,
  phone: '+92 300 5551234',
  password: 'Password123!',
}
const admin = new Client(`${BASE}/api`)
const guest = new Client(`${BASE}/api`)
const api2 = new Client(`${BASE}/api`)

async function run() {
  /* ───────────────────────── Health & public catalog ───────────────────────── */
  section('Health & public catalog')
  const health = await api.get('/health')
  check('API health responds', health.ok === true)

  const menu = await api.get('/menu')
  check('menu returns dishes', Array.isArray(menu.items) && menu.items.length > 10, `${menu.items?.length} dishes`)
  const dish = menu.items.find((i) => i.available)
  check('dishes carry pricing + media', dish.price > 0 && Boolean(dish.image))

  const filtered = await api.get('/menu?category=pizza')
  check('menu filters by category', filtered.items.every((i) => i.category === 'pizza'))
  const searched = await api.get('/menu?search=truffle')
  check('menu search works', searched.items.length > 0 && searched.items.some((i) => /truffle/i.test(i.name)))
  const sorted = await api.get('/menu?sort=price-asc')
  check('menu sorts by price', sorted.items[0].price <= sorted.items[sorted.items.length - 1].price)

  const categories = await api.get('/menu/categories')
  check('categories include live counts', categories.categories.length >= 8 && categories.categories.some((c) => c.count > 0))

  const detail = await api.get(`/menu/${dish._id}`)
  check('dish detail loads', detail.item._id === dish._id && Array.isArray(detail.item.ingredients))

  const settings = await api.get('/settings')
  check('restaurant settings are public', settings.settings.name?.length > 0)

  const content = await api.get('/content')
  check('CMS content blocks are public', Object.keys(content.content).length >= 15)
  check('home hero block present', Boolean(content.content['home.hero']?.title))

  const gallery = await api.get('/gallery')
  check('gallery is served from the database', gallery.gallery.length >= 9)

  const faqs = await api.get('/faqs')
  check('FAQs are served from the database', faqs.faqs.length >= 6)

  const stats = await api.get('/stats')
  check('live site stats computed', stats.dishes > 0 && stats.rating > 0)

  const reviews = await api.get('/reviews?limit=5')
  check('published reviews are public', reviews.reviews.length > 0)

  await guest.get('/menu')
  check('guests can browse without a session', true)

  /* ───────────────────────── Guest restrictions ───────────────────────── */
  section('Auth guards')
  try {
    await guest.get('/users/me')
    check('guest cannot read /users/me', false)
  } catch (error) {
    check('guest cannot read /users/me', error.status === 401)
  }
  try {
    await guest.get('/admin/stats')
    check('guest cannot read admin stats', false)
  } catch (error) {
    check('guest cannot read admin stats', error.status === 401)
  }

  /* ───────────────────────── Registration & login ───────────────────────── */
  section('Registration, login & session')
  const registered = await api.post('/auth/register', customer)
  check('registration returns a user', registered.user?.email === customer.email)
  check('password is never returned', !('passwordHash' in (registered.user || {})))

  const me = await api.get('/auth/me')
  check('session cookie authenticates /auth/me', me.user?.email === customer.email)

  const dupe = await api.post('/auth/register', { ...customer, email: customer.email.toUpperCase() }).catch((e) => e)
  check('duplicate email rejected', dupe.status === 409)

  const weak = await api.post('/auth/register', { ...customer, email: `weak.${stamp}@example.com`, password: 'short' }).catch((e) => e)
  check('weak password rejected', weak.status === 400)

  const badLogin = await api.post('/auth/login', { email: customer.email, password: 'wrong-password' }).catch((e) => e)
  check('wrong password rejected', badLogin.status === 401)

  await api.post('/auth/logout')
  const afterLogout = await api.get('/auth/me').catch((e) => e)
  check('logout clears the session', afterLogout.status === 401)

  await api.post('/auth/login', { email: customer.email, password: customer.password })
  check('login re-establishes the session', (await api.get('/auth/me')).user.email === customer.email)

  const forgot = await api.post('/auth/forgot', { email: customer.email })
  check('password reset request accepted', Boolean(forgot.message))

  /* ───────────────────────── Cart ───────────────────────── */
  section('Cart & pricing')
  const cartPayload = {
    items: [
      { menuItem: dish._id, qty: 2, size: 'large', addons: [{ id: 'extra-cheese', label: 'Extra Cheese', price: 2 }], notes: 'No onions' },
      { menuItem: menu.items[1]._id, qty: 1, size: 'regular', addons: [] },
    ],
  }
  let cart = await api.put('/cart', cartPayload)
  check('cart saves line items', cart.cart.items.length === 2)
  const unit = dish.price + 4 + 2
  check('server re-prices size + addons', Math.abs(cart.totals.subtotal - (unit * 2 + menu.items[1].price)) < 0.01, JSON.stringify(cart.totals))

  const badCoupon = await api.post('/cart/coupon', { code: 'NOPE', subtotal: 100 }).catch((e) => e)
  check('invalid coupon rejected', badCoupon.status === 404)

  const coupon = await api.post('/cart/coupon', { code: 'welcome10', subtotal: 100 })
  check('valid coupon accepted (case-insensitive)', coupon.coupon.code === 'WELCOME10')

  cart = await api.put('/cart', { ...cartPayload, couponCode: 'WELCOME10' })
  check('coupon applies a discount to totals', cart.totals.discount > 0, JSON.stringify(cart.totals))
  check('tax + delivery computed server-side', cart.totals.tax > 0 && cart.totals.total > cart.totals.subtotal - cart.totals.discount)

  const minCoupon = await api.post('/cart/coupon', { code: 'SAGE20', subtotal: 10 }).catch((e) => e)
  check('coupon minimum enforced', minCoupon.status === 400)

  const merged = await api.post('/cart/merge', { items: [{ menuItem: dish._id, qty: 1 }] })
  check('guest cart merges into account cart', merged.cart.items.length >= 2)

  /* ───────────────────────── Checkout ───────────────────────── */
  section('Checkout, payments & orders')
  const orderPayload = {
    items: [{ menuItem: dish._id, qty: 1, size: 'regular', addons: [], notes: '' }],
    fulfillment: 'delivery',
    address: { line: 'House 1, Test Street', city: 'Islamabad', postal: '44000', instructions: 'Ring the bell' },
    payment: { method: 'card', cardNumber: '4242 4242 4242 4242', expiry: '12/29', cvv: '123', holder: 'ADA LOVELACE' },
    contact: { name: 'Ada Lovelace', email: customer.email, phone: customer.phone },
    notes: 'Leave at the door',
  }
  const declined = await api.post('/orders', { ...orderPayload, payment: { ...orderPayload.payment, cardNumber: '4000 0000 0000 0002' } }).catch((e) => e)
  check('declined card is rejected', declined.status === 402, declined.message)

  const cod = await api.post('/orders', { ...orderPayload, payment: { method: 'cod' } })
  check('cash on delivery order created', cod.order.paymentStatus === 'pending' && cod.order.paymentMethod === 'cod')

  const paid = await api.post('/orders', { ...orderPayload, couponCode: 'WELCOME10' })
  check('paid order created', paid.order.paymentStatus === 'paid' && paid.order.total > 0)
  check('order number assigned', paid.order.orderNumber > 0)
  check('coupon recorded on the order', paid.order.couponCode === 'WELCOME10')

  const emptyCart = await api.get('/cart')
  check('cart cleared after checkout', emptyCart.cart.items.length === 0)

  const mine = await api.get('/orders/mine')
  check('my orders lists the new orders', mine.orders.length >= 2)
  check('orders newest first', mine.orders[0].createdAt >= mine.orders[mine.orders.length - 1].createdAt)

  const tracking = await api.get(`/orders/${paid.order.orderNumber}/tracking`)
  check('order tracking payload', tracking.order.orderNumber === paid.order.orderNumber && tracking.order.items.length > 0)

  const cancel = await api.post(`/orders/${cod.order.orderNumber}/cancel`, { reason: 'Changed my mind' })
  check('customer can cancel a pending order', cancel.order.orderStatus === 'Cancelled')

  const reorder = await api.post(`/orders/${paid.order.orderNumber}/reorder`)
  check('reorder pushes items back into the cart', reorder.cart.items.length > 0 && reorder.added > 0)
  await api.del('/cart')

  /* ───────────────────────── Account ───────────────────────── */
  section('Account: profile, addresses, favorites, loyalty')
  const profile = await api.patch('/users/me', { firstName: 'Ada', lastName: 'Byron', phone: '+92 301 0000000' })
  check('profile updates persist', profile.user.lastName === 'Byron')

  const taken = await api.patch('/users/me', { email: 'demo@ember.pk' }).catch((e) => e)
  check('email collision rejected', taken.status === 409)

  const passwordChange = await api.patch('/users/me/password', { currentPassword: customer.password, newPassword: 'NewPassword123!' })
  check('password change succeeds', Boolean(passwordChange.message))
  const wrongPassword = await api.patch('/users/me/password', { currentPassword: 'nope-nope', newPassword: 'NewPassword123!' }).catch((e) => e)
  check('wrong current password rejected', wrongPassword.status === 401)
  await api.patch('/users/me/password', { currentPassword: 'NewPassword123!', newPassword: customer.password })

  const prefs = await api.patch('/users/me/preferences', { orderEmails: false, promos: true })
  check('notification preferences persist', prefs.preferences.promos === true)

  const address = await api.post('/users/me/addresses', { label: 'Home', line: '12 Test Road', city: 'Islamabad', postal: '44000', phone: customer.phone })
  check('address created', address.address.line === '12 Test Road')
  check('first address becomes default', address.address.isDefault === true)
  const addresses = await api.get('/users/me/addresses')
  check('addresses list', addresses.addresses.length >= 1)
  await api.patch(`/users/me/addresses/${address.address._id}`, { line: '13 Updated Road' })
  check('address updates', (await api.get('/users/me/addresses')).addresses[0].line === '13 Updated Road')

  const fav = await api.post(`/users/me/favorites/${dish._id}`)
  check('dish added to favorites', fav.added === true)
  const favOff = await api.post(`/users/me/favorites/${dish._id}`)
  check('dish removed from favorites', favOff.added === false)
  await api.post(`/users/me/favorites/${dish._id}`)
  const favList = await api.get('/users/me/favorites')
  check('favorites return full dishes', favList.items.length === 1 && favList.items[0]._id === dish._id)

  const viewed = await api.post(`/users/me/viewed/${menu.items[2]._id}`)
  check('recently viewed tracked', viewed.recentlyViewed.length === 1)
  const recent = await api.get('/users/me/recently-viewed')
  check('recently viewed returns dishes', recent.items.length === 1)

  const method = await api.post('/users/me/payment-methods', { cardNumber: '5555 5555 5555 4444', expiry: '08/30', cvv: '123', holder: 'ADA LOVELACE' })
  check('payment method saved (masked)', method.methods[0].last4 === '4444' && !('cvv' in method.methods[0]))

  const summary = await api.get('/users/me/summary')
  check('account summary returns stats', summary.stats.orders >= 1 && Boolean(summary.loyalty?.tier))
  check('account summary tracks spend', summary.stats.spent > 0)
  check('account summary shows loyalty progress', Boolean(summary.loyalty.nextTier?.pointsNeeded))
  check('loyalty tiers exposed', Array.isArray(summary.loyalty.tiers) && summary.loyalty.tiers.length === 4)

  const notifs = await api.get('/users/me/notifications')
  check('order notifications created', notifs.notifications.length >= 2)
  await api.patch('/users/me/notifications/read-all')
  check('notifications can be marked read', (await api.get('/users/me/notifications')).unread === 0)

  /* ───────────────────────── Reviews, reservations, contact ───────────────────────── */
  section('Reviews, reservations, contact & newsletter')
  const review = await api.post('/reviews', {
    rating: 5,
    text: 'Absolutely faultless — the pasta arrived hot and the truffle was generous.',
    menuItemId: dish._id,
    dish: dish.name,
  })
  check('customer can publish a review', review.review.rating === 5)
  const shortReview = await api.post('/reviews', { rating: 5, text: 'ok' }).catch((e) => e)
  check('too-short review rejected', shortReview.status === 400)

  const reservation = await api.post('/reservations', {
    name: 'Ada Lovelace',
    email: customer.email,
    phone: customer.phone,
    date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
    time: '7:30 PM',
    guests: '4',
    notes: 'Window table please',
  })
  check('reservation created', Boolean(reservation.reservation._id))
  const myReservations = await api.get('/reservations/mine')
  check('my reservations listed', myReservations.reservations.length >= 1)
  const cancelledRes = await api.patch(`/reservations/${reservation.reservation._id}/cancel`)
  check('customer can cancel their reservation', cancelledRes.reservation.status === 'Cancelled')
  const cancelAgain = await api.patch(`/reservations/${reservation.reservation._id}/cancel`).catch((e) => e)
  check('double cancel is rejected', cancelAgain.status === 409)
  const stolen = await api2.patch(`/reservations/${reservation.reservation._id}/cancel`).catch((e) => e)
  check('strangers cannot cancel my reservation', [401, 403, 404].includes(stolen.status))

  const contact = await api.post('/contact', { name: 'Ada', email: customer.email, message: 'Do you cater for 40 people?' })
  check('contact message stored', Boolean(contact.message))

  const sub = await api.post('/subscribers', { email: `news.${stamp}@example.com` })
  check('newsletter subscribe works', Boolean(sub.subscriber?.email))
  const subAgain = await api.post('/subscribers', { email: `news.${stamp}@example.com` })
  check('duplicate subscribe is idempotent', Boolean(subAgain.message))
  const badSub = await api.post('/subscribers', { email: 'not-an-email' }).catch((e) => e)
  check('invalid email rejected', badSub.status === 400)

  const orderReview = await api.post(`/orders/${paid.order.orderNumber}/review`, { rating: 4, text: 'Tasty, arrived on time.' }).catch((e) => e)
  check('cannot review an undelivered order', orderReview.status === 400)

  /* ───────────────────────── Admin ───────────────────────── */
  section('Admin: dashboard, orders, menu, customers, CMS')
  await admin.post('/auth/login', { email: 'admin@ember.pk', password: 'Password123!' })
  check('admin login works', (await admin.get('/auth/me')).user.role === 'admin')

  const forbidden = await api.get('/admin/stats').catch((e) => e)
  check('customer cannot access admin stats', forbidden.status === 403)

  const dashboard = await admin.get('/admin/stats')
  check('dashboard totals computed', typeof dashboard.todayOrders === 'number' && dashboard.revenueSeries.length === 7)
  check('dashboard lists recent orders', dashboard.recentOrders.length > 0)

  const adminOrders = await admin.get('/admin/orders?status=Pending')
  check('admin order list filters', adminOrders.orders.every((o) => o.status === 'Pending'))

  const target = (await admin.get('/admin/orders')).orders.find((o) => o.status !== 'Delivered' && o.status !== 'Cancelled')
  const updated = await admin.patch(`/admin/orders/${target.id}/status`, { status: 'Delivered' })
  check('order status updated', updated.order.orderStatus === 'Delivered')
  check('status change writes a timeline step', (updated.order.timeline || []).some((t) => t.status === 'Delivered'))

  const analytics = await admin.get('/admin/analytics?days=30')
  check('analytics returns a 30-day series', analytics.revenueSeries.length === 30)
  check('analytics top dishes from real orders', analytics.topDishes.length > 0 && analytics.topDishes[0].orders > 0)
  check('analytics summary populated', analytics.summary.orders > 0 && analytics.summary.avgOrderValue > 0)

  const newDish = await admin.upload('/menu', dishForm({ name: `Test Dish ${stamp}`, price: 12.5, category: 'mains', description: 'Created by the API test' }))
  check('admin can create a dish', newDish.item.name === `Test Dish ${stamp}`)
  const updatedDish = await admin.put(`/menu/${newDish.item._id}`, jsonForm({ price: 15.5, available: false }))
  check('admin can update a dish', updatedDish.item.price === 15.5 && updatedDish.item.available === false)
  const availability = await admin.patch(`/menu/${newDish.item._id}/availability`, { available: true })
  check('availability toggles', availability.item.available === true)
  const menuCount = await admin.del(`/menu/${newDish.item._id}`)
  check('admin can delete a dish', Boolean(menuCount.message))
  check('deleted dish is gone', (await api.get('/menu')).items.every((i) => i._id !== newDish.item._id))

  const category = await admin.post('/menu/categories', jsonForm({ name: `Test Category ${stamp}`, description: 'Temporary' }))
  check('admin can create a category', category.category.slug.includes('test-category'))
  await admin.del(`/menu/categories/${category.category._id}`)
  check('category deleted', (await api.get('/menu/categories')).categories.every((c) => c._id !== category.category._id))
  const usedCategory = await admin.post('/menu/categories', jsonForm({ name: `Blocked ${stamp}`, description: 'Temporary' }))
  const dishInCategory = await admin.upload('/menu', dishForm({ name: `Blocked Dish ${stamp}`, price: 9, category: usedCategory.category.slug, description: 'x' }))
  const blockedDelete = await admin.del(`/menu/categories/${usedCategory.category._id}`).catch((e) => e)
  check('category with dishes cannot be deleted', blockedDelete.status === 400)
  await admin.del(`/menu/${dishInCategory.item._id}`)
  await admin.del(`/menu/categories/${usedCategory.category._id}`)

  const newCoupon = await admin.post('/admin/coupons', { code: `TEST${stamp}`.slice(0, 10), type: 'percent', value: 15, minOrder: 20, label: 'Test coupon' })
  check('admin can create a coupon', newCoupon.coupon.code?.length > 0)
  const applied = await api.post('/cart/coupon', { code: newCoupon.coupon.code, subtotal: 50 })
  check('new coupon is immediately usable by customers', applied.coupon.value === 15)
  await admin.del(`/admin/coupons/${newCoupon.coupon._id}`)
  check('coupon deleted', (await admin.get('/admin/coupons')).coupons.every((c) => c.code !== newCoupon.coupon.code))

  const customers = await admin.get('/admin/customers')
  check('customer list computed from orders', customers.customers.length > 5)
  const vip = customers.customers.find((c) => c.orders > 0)
  const customerDetail = await admin.get(`/admin/customers/${vip.id}`)
  check('customer detail loads', customerDetail.customer.email === vip.email && Array.isArray(customerDetail.orders))

  const adminReservations = await admin.get('/admin/reservations')
  check('reservations visible to admin', adminReservations.reservations.length >= 1)
  const res = adminReservations.reservations[0]
  const confirmed = await admin.patch(`/admin/reservations/${res._id}`, { status: 'Confirmed' })
  check('reservation status updated', confirmed.reservation.status === 'Confirmed')

  const adminReviews = await admin.get('/admin/reviews')
  check('reviews visible to admin', adminReviews.reviews.length >= 1)
  const moderated = await admin.patch(`/admin/reviews/${review.review._id}`, { status: 'hidden', reply: 'Thanks Ada!' })
  check('review can be hidden + replied', moderated.review.status === 'hidden' && moderated.review.reply === 'Thanks Ada!')
  check('hidden review disappears from the storefront', (await api.get('/reviews?limit=50')).reviews.every((r) => r._id !== review.review._id))
  await admin.patch(`/admin/reviews/${review.review._id}`, { status: 'published' })

  const adminContent = await admin.get('/admin/content')
  check('CMS blocks listed for admin', adminContent.blocks.length >= 15)
  const edited = await admin.put('/admin/content/home.hero', { title: 'Good Food. Great Mood.' })
  check('CMS block editable', edited.block.title === 'Good Food. Great Mood.')
  check('storefront reflects the CMS edit', (await api.get('/content/home.hero')).block.title === 'Good Food. Great Mood.')
  await admin.put('/admin/content/home.hero', { title: 'Good Food. Good Mood.' })

  const galleryItem = await admin.post('/admin/gallery', jsonForm({ title: `Test photo ${stamp}`, image: '/images/hero.jpg', category: 'Food', sortOrder: 99 }))
  check('gallery photo created', galleryItem.item.title.includes('Test photo'))
  check('gallery photo live immediately', (await api.get('/gallery')).gallery.some((g) => g._id === galleryItem.item._id))
  const galleryEdit = await admin.upload(
    `/admin/gallery/${galleryItem.item._id}`,
    jsonForm({ title: `Renamed ${stamp}`, caption: 'A caption', active: 'false' }),
    'PUT',
  )
  check('gallery photo edited', galleryEdit.item.title === `Renamed ${stamp}` && galleryEdit.item.caption === 'A caption')
  check('hidden gallery photo drops off the site', (await api.get('/gallery')).gallery.every((g) => g._id !== galleryItem.item._id))
  await admin.del(`/admin/gallery/${galleryItem.item._id}`)
  check('gallery photo deleted', (await api.get('/gallery')).gallery.every((g) => g._id !== galleryItem.item._id))

  const restore = await admin.post('/admin/content/restore-defaults', {})
  check('content blocks can be restored to defaults', restore.blocks.length >= 15)

  const faq = await admin.post('/admin/faqs', { question: `Test question ${stamp}?`, answer: 'Test answer', category: 'Orders', sortOrder: 99 })
  check('FAQ created', faq.faq.question.includes('Test question'))
  check('FAQ live on the site', (await api.get('/faqs')).faqs.some((f) => f._id === faq.faq._id))
  await admin.del(`/admin/faqs/${faq.faq._id}`)

  const subscribers = await admin.get('/admin/subscribers')
  check('subscribers visible to admin', subscribers.subscribers.length >= 1)
  const subRow = subscribers.subscribers[0]
  await admin.patch(`/admin/subscribers/${subRow._id}`, { active: false })
  check('subscriber can be deactivated', (await admin.get('/admin/subscribers')).subscribers.find((s) => s._id === subRow._id).active === false)
  await admin.patch(`/admin/subscribers/${subRow._id}`, { active: true })
  check('subscriber can be reactivated', (await admin.get('/admin/subscribers')).subscribers.find((s) => s._id === subRow._id).active === true)
  const inbox = await admin.get('/admin/messages')
  check('contact messages reach the admin inbox', inbox.messages.length >= 1)
  const firstMessage = inbox.messages[0]
  const marked = await admin.patch(`/admin/messages/${firstMessage._id}`, { status: 'read' })
  check('message can be marked read', marked.message.status === 'read')
  const archived = await admin.patch(`/admin/messages/${firstMessage._id}`, { status: 'archived' })
  check('message can be archived', archived.message.status === 'archived')
  await admin.del(`/admin/messages/${firstMessage._id}`)
  check('message can be deleted', (await admin.get('/admin/messages')).messages.every((m) => m._id !== firstMessage._id))
  const guestInbox = await api.get('/admin/messages').catch((e) => e)
  check('inbox is admin-only', guestInbox.status === 401 || guestInbox.status === 403)

  const offerList = await api.get('/coupons')
  check('active offers exposed to the storefront', Array.isArray(offerList.coupons) && offerList.coupons.every((c) => c.active !== false))
  check('offers carry the code and value', offerList.coupons.every((c) => Boolean(c.code) && ['percent', 'flat', 'delivery'].includes(c.type) && typeof c.value === 'number'))

  const uploaded = await admin.upload('/admin/media', mediaForm())
  check('media upload stores the asset', Boolean(uploaded.asset?.url))
  const mediaList = await admin.get('/admin/media')
  check('media library lists uploads', mediaList.assets.some((a) => a._id === uploaded.asset._id))
  const served = await fetch(`${BASE}${uploaded.asset.url}`)
  check('uploaded file is served over HTTP', served.status === 200)
  await admin.del(`/admin/media/${uploaded.asset._id}`)

  const settingsUpdate = await admin.patch('/admin/settings', { taxRate: 0.12, deliveryFee: 4, maintenance: false })
  check('settings updated', settingsUpdate.settings.taxRate === 0.12)
  check('settings are public and live', (await api.get('/settings')).settings.deliveryFee === 4)
  await admin.patch('/admin/settings', { taxRate: 0.1, deliveryFee: 3.5 })

  const logs = await admin.get('/admin/audit-logs')
  check('audit trail records admin actions', logs.logs.length > 3)

  /* ───────────────────────── Maintenance mode ───────────────────────── */
  section('Maintenance mode')
  await admin.patch('/admin/settings', { maintenance: true })
  const blocked = await api.post('/orders', orderPayload).catch((e) => e)
  check('orders blocked during maintenance', blocked.status === 503)
  await admin.patch('/admin/settings', { maintenance: false })
  const unblocked = await api.post('/orders', { ...orderPayload, payment: { method: 'cod' } }).catch((e) => e)
  check('orders allowed again', unblocked.order?.orderNumber > 0)

  /* ───────────────────────── Account deletion ───────────────────────── */
  section('Account lifecycle')
  const deleteNoPassword = await api.del('/users/me', {}).catch((e) => e)
  check('account deletion requires the password', deleteNoPassword.status === 401)
  const deleted = await api.del('/users/me', { password: customer.password })
  check('account can be deleted', Boolean(deleted.message))
  const gone = await api.get('/auth/me').catch((e) => e)
  check('deleted account is signed out', gone.status === 401)
}

/* ————————————————— form helpers ————————————————— */

function jsonForm(object) {
  const form = new FormData()
  for (const [key, value] of Object.entries(object)) form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  return form
}

function dishForm(object) {
  return jsonForm({ ...object, ingredients: JSON.stringify(['Test']), allergens: JSON.stringify([]), tags: JSON.stringify([]) })
}

function mediaForm() {
  const form = new FormData()
  const file = path.join(__dirname, 'fixtures', 'test-image.png')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, PNG)
  const buffer = fs.readFileSync(file)
  form.append('image', new Blob([buffer], { type: 'image/png' }), 'test-image.png')
  return form
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

try {
  await run()
} catch (error) {
  failed += 1
  failures.push(`fatal: ${error.message}`)
  console.error('\n\x1b[31mFatal error:\x1b[0m', error)
}

console.log(`\n${'─'.repeat(60)}`)
console.log(`API tests: \x1b[32m${passed} passed\x1b[0m, ${failed ? `\x1b[31m${failed} failed\x1b[0m` : '0 failed'}`)
if (failures.length) {
  console.log('\nFailures:')
  failures.forEach((f) => console.log(` - ${f}`))
}
process.exit(failed ? 1 : 0)

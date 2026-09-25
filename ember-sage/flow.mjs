import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const errors = []
const log = []

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() !== 'error') return
  const t = m.text()
  if (t.includes('Download the React') || t.includes('unique "key"')) return
  errors.push(`console: ${t.slice(0, 240)}`)
})
page.on('response', async (r) => {
  const s = r.status()
  if (s === 400 || (s === 401 && !r.url().includes('/auth/me'))) {
    let body = ''
    try { body = (await r.text()).slice(0, 200) } catch {}
    errors.push(`http ${s}: ${r.request().method()} ${r.url().replace(BASE, '')} => ${body}`)
  }
})
page.on('framenavigated', (f) => {
  if (f === page.mainFrame() && !f.url().includes('localhost')) return
  if (f === page.mainFrame()) log.push(`.. NAV ${f.url().replace(BASE, '')}`)
})

const step = (name, ok, extra = '') => {
  log.push(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!ok) process.exitCode = 1
}

const serverCartCount = () =>
  page.evaluate(async () => {
    const r = await fetch('/api/cart', { credentials: 'include' })
    const d = await r.json()
    return d.cart.items.reduce((s, i) => s + i.qty, 0)
  })

const waitForServerCart = async (n, timeout = 8000) => {
  const t0 = Date.now()
  let c = 0
  while (Date.now() - t0 < timeout) {
    c = await serverCartCount()
    if (c >= n) return c
    await page.waitForTimeout(400)
  }
  return c
}

try {
  // 1. Login (customer, server session)
  await page.goto(`${BASE}/login`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await page.fill('input[type="email"]', 'demo@ember.pk')
  await page.fill('input[type="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL(/menu|admin|account/, { timeout: 10000 })
  step('login redirects', true, page.url())

  // reset server cart so counts are deterministic
  await page.evaluate(async () => {
    await fetch('/api/cart', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })
  })

  // 2. Add items from menu (live API)
  await page.goto(`${BASE}/menu`, { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  const addButtons = page.locator('button[aria-label^="Add "]')
  await addButtons.nth(0).click()
  await page.waitForTimeout(700)
  const closeCart = page.locator('button[aria-label="Close cart"]')
  if (await closeCart.count()) await closeCart.click()
  await page.waitForTimeout(400)
  await addButtons.nth(1).click()
  await page.waitForTimeout(700)
  if (await closeCart.count()) await closeCart.click()
  const c1 = await waitForServerCart(2)
  step('added 2 items (server cart)', c1 >= 2, `server qty=${c1}`)
  await page.waitForTimeout(400)
  const cartLabel = await page.locator('header button[aria-label*="Open cart"]').getAttribute('aria-label')
  step('badge reflects cart', /Open cart, [2-9] items/.test(cartLabel || ''), cartLabel)

  // 3. Detail page customization → add
  await page.goto(`${BASE}/menu/ribeye`, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  await page.waitForTimeout(600)
  await page.click('text=Large')
  await page.click('text=Extra Cheese')
  await page.fill('textarea', 'Medium rare please')
  await page.click('button:has-text("Add to Cart")')
  await page.waitForTimeout(800)
  const close2 = page.locator('button[aria-label="Close cart"]')
  if (await close2.count()) await close2.click()
  const c2 = await waitForServerCart(3)
  step('customized item added', c2 >= 3, `server qty=${c2}`)

  // 4. Cart + async coupon validation
  await page.goto(`${BASE}/cart`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.fill('#coupon', 'WELCOME10')
  await page.click('button:has-text("Apply")')
  try {
    await page.locator('text=Discount').first().waitFor({ timeout: 8000 })
    step('coupon applied (server validated)', true)
  } catch {
    step('coupon applied (server validated)', false, 'Discount row never appeared')
  }
  await page.screenshot({ path: 'shots/flow-cart.png' })

  // 5. Checkout delivery step
  await page.click('button:has-text("Proceed to Checkout")')
  await page.waitForURL(/checkout/, { timeout: 8000 })
  await page.waitForTimeout(700)
  // scope to <main> so footer fields ("Email address") never match "Address"
  const main = page.locator('main')
  const byLabel = async (label, value) => {
    const loc = main.getByLabel(label, { exact: false })
    if (await loc.count()) await loc.first().fill(value)
  }
  await byLabel('First Name', 'Ayesha')
  await byLabel('Last Name', 'Khan')
  await byLabel('Phone', '+92 300 1234567')
  await byLabel('Address', 'House 42, Street 18')
  await byLabel('City', 'Islamabad')
  await byLabel('Postal Code', '44000')
  await page.click('button:has-text("Continue to Payment")')
  await page.waitForTimeout(900)
  const step2 = await page.locator('text=Payment Method').isVisible()
  if (!step2) {
    const addrVal = await main.getByLabel('Address', { exact: false }).first().inputValue().catch(() => '?')
    const zipVal = await main.getByLabel('Postal Code', { exact: false }).first().inputValue().catch(() => '?')
    step('checkout step 2', false, `addr="${addrVal}" zip="${zipVal}"`)
  } else {
    step('checkout step 2', true)
  }
  await page.screenshot({ path: 'shots/flow-payment.png' })

  // 6. Payment + place order (live POST /api/orders)
  await byLabel('Card Number', '4242424242424242')
  await byLabel('Expiry Date', '0928')
  await byLabel('CVV', '123')
  await byLabel('Cardholder Name', 'Ayesha Khan')
  await page.click('button:has-text("Place Order")')
  await page.waitForURL(/order-confirmed/, { timeout: 20000 })
  try {
    await page.locator('h1:has-text("Order Confirmed")').waitFor({ timeout: 12000 })
    step('order confirmed (API order created)', true)
  } catch {
    step('order confirmed (API order created)', false, 'h1 never appeared')
  }
  await page.screenshot({ path: 'shots/flow-confirmed.png' })

  // 7. Track (live GET /orders/:id/tracking)
  await page.click('button:has-text("Track My Order")')
  await page.waitForURL(/track\//, { timeout: 8000 })
  try {
    await page.locator('h2:has-text("Order Status")').waitFor({ timeout: 12000 })
    step('tracking page', true, page.url())
  } catch {
    step('tracking page', false, `no Order Status at ${page.url()}`)
  }

  // 8. Account pages (live APIs)
  for (const [path, marker] of [
    ['/account', 'Personal Information'],
    ['/account/orders', 'Order #'],
    ['/account/favorites', 'Favorites'],
    ['/account/addresses', 'Saved Addresses'],
    ['/account/payments', 'Payment Methods'],
    ['/account/settings', 'Notifications'],
  ]) {
    await page.goto(BASE + path, { waitUntil: 'load' })
    try {
      await page.locator(`text=${marker}`).first().waitFor({ timeout: 6000 })
      step(`account ${path}`, true)
    } catch {
      step(`account ${path}`, false, `missing "${marker}"`)
    }
  }
  await page.screenshot({ path: 'shots/flow-account.png' })

  // 9. Admin (requires admin login on live API)
  await page.goto(`${BASE}/admin/menu`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const onLogin = /\/login/.test(page.url())
  step('non-admin redirected to login', onLogin, page.url())
  if (onLogin) {
    await page.fill('input[type="email"]', 'admin@ember.pk')
    await page.fill('input[type="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin/, { timeout: 10000 })
    step('admin login', true, page.url())
  }

  try {
    await page.locator("text=Today's Orders").first().waitFor({ timeout: 12000 })
    step('admin dashboard live stats', true)
  } catch {
    step('admin dashboard live stats', false, 'stat card never rendered')
  }
  await page.screenshot({ path: 'shots/flow-admin.png' })

  await page.goto(`${BASE}/admin/menu`, { waitUntil: 'load' })
  await page.waitForTimeout(700)
  await page.click('button:has-text("Add New Dish")')
  await page.waitForTimeout(600)
  const drawerOpen = await page.locator('text=POST /api/menu').isVisible()
  step('admin dish drawer (multipart ready)', drawerOpen)
  await page.screenshot({ path: 'shots/flow-admin-drawer.png' })

  // 10. Admin orders table live
  await page.goto(`${BASE}/admin/orders`, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const orderRows = await page.locator('tbody tr').count()
  step('admin orders live table', orderRows > 0, `${orderRows} rows`)

  // 11. Admin menu list shows live dishes
  await page.goto(`${BASE}/admin/menu`, { waitUntil: 'load' })
  try {
    await page.locator('article').first().waitFor({ timeout: 12000 })
    const dishCards = await page.locator('article').count()
    step('admin menu live dishes', dishCards >= 10, `${dishCards} dishes`)
  } catch {
    step('admin menu live dishes', false, 'no dish cards rendered')
  }
} catch (e) {
  step('flow crashed', false, e.message.split('\n')[0])
}

console.log(log.join('\n'))
console.log('\nUNIQUE ERRORS:', [...new Set(errors)].length)
;[...new Set(errors)].forEach((e) => console.log(' -', e))

await browser.close()

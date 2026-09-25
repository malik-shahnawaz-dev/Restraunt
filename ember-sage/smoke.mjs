import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const routes = [
  ['/', 'home'],
  ['/menu', 'menu'],
  ['/menu/truffle-pasta', 'food-detail'],
  ['/login', 'login'],
  ['/register', 'register'],
  ['/forgot-password', 'forgot'],
  ['/cart', 'cart'],
  ['/checkout', 'checkout'],
  ['/order-confirmed', 'confirmed'],
  ['/track/10256', 'tracking'],
  ['/about', 'about'],
  ['/gallery', 'gallery'],
  ['/contact', 'contact'],
  ['/reservations', 'reservations'],
  ['/admin', 'admin'],
  ['/admin/orders', 'admin-orders'],
  ['/admin/menu', 'admin-menu'],
  ['/admin/customers', 'admin-customers'],
  ['/admin/analytics', 'admin-analytics'],
  ['/nope', 'notfound'],
]

const results = []
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`)
})

for (const [route, name] of routes) {
  const before = errors.length
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(500)
    const h1 = await page.locator('h1').first().textContent().catch(() => null)
    await page.screenshot({ path: `shots/${name}.png`, fullPage: false })
    const newErrs = errors.slice(before)
    results.push({ route, status: 'OK', h1: (h1 || '').trim().slice(0, 60), errs: newErrs })
  } catch (e) {
    results.push({ route, status: 'FAIL', err: e.message.slice(0, 200) })
  }
}

// Interaction flow: add to cart → cart page
await page.goto(BASE + '/menu', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const addBtn = page.locator('button[aria-label^="Add "]').first()
if (await addBtn.count()) {
  await addBtn.click()
  await page.waitForTimeout(800)
  const badge = await page.locator('header button[aria-label*="Open cart"]').getAttribute('aria-label')
  results.push({ route: 'flow:add-to-cart', status: badge?.includes('1 item') || badge?.match(/Open cart, [1-9]/) ? 'OK' : 'CHECK', badge })
} else {
  results.push({ route: 'flow:add-to-cart', status: 'FAIL', err: 'no add button' })
}

// Mobile viewport screenshot
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: 'shots/home-mobile.png' })
await page.goto(BASE + '/menu', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: 'shots/menu-mobile.png' })

console.log(JSON.stringify(results, null, 2))
const allErrs = [...new Set(errors)]
console.log('\nUNIQUE ERRORS:', allErrs.length)
allErrs.forEach((e) => console.log(' -', e))

await browser.close()

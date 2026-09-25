/**
 * render-harness.mjs — headless render check for every route.
 *
 * There is no browser binary available in this sandbox (Playwright cannot
 * download Chromium and the system is missing libnss3), so this harness mounts
 * the real React tree inside jsdom, wired to the live API on :4000, and asserts
 * that every route mounts, fetches its data and renders real content.
 *
 * Usage:  node --disable-warning=ExperimentalWarning scripts/render-harness.mjs
 *         (expects `npm run dev` / the API on http://localhost:4000)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import * as esbuild from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = process.env.API_URL || 'http://localhost:4000'
const OUT = path.join(os.tmpdir(), `es-render-${process.pid}.mjs`)

const ROUTES = [
  { path: '/', role: 'guest', expect: [/ember/i, /reserve|menu|order/i] },
  { path: '/menu', role: 'guest', expect: [/menu/i, /\$/] },
  { path: '/about', role: 'guest', expect: [/story|chef|since|kitchen/i] },
  { path: '/gallery', role: 'guest', expect: [/gallery/i] },
  { path: '/contact', role: 'guest', expect: [/contact|hours|phone|call/i] },
  { path: '/reservations', role: 'guest', expect: [/reserv|table|guests/i] },
  { path: '/login', role: 'guest', expect: [/sign in|welcome back|password/i] },
  { path: '/register', role: 'guest', expect: [/create|account|password/i] },
  { path: '/cart', role: 'guest', expect: [/cart|empty|order/i] },
  { path: '/checkout', role: 'customer', expect: [/checkout|delivery|payment|address/i] },
  { path: '/account', role: 'customer', expect: [/points|orders|member/i] },
  { path: '/account/orders', role: 'customer', expect: [/orders|track|reorder/i] },
  { path: '/account/reservations', role: 'customer', expect: [/reservation|table|book/i] },
  { path: '/account/favorites', role: 'customer', expect: [/favorite|saved/i] },
  { path: '/account/addresses', role: 'customer', expect: [/address|add|home|work/i] },
  { path: '/account/payments', role: 'customer', expect: [/payment|card/i] },
  { path: '/account/notifications', role: 'customer', expect: [/notification|unread/i] },
  { path: '/account/settings', role: 'customer', expect: [/password|notification|preference/i] },
  { path: '/admin', role: 'admin', expect: [/dashboard|revenue|orders/i] },
  { path: '/admin/orders', role: 'admin', expect: [/orders/i] },
  { path: '/admin/menu', role: 'admin', expect: [/dish|menu|item/i] },
  { path: '/admin/categories', role: 'admin', expect: [/categor/i] },
  { path: '/admin/customers', role: 'admin', expect: [/customer/i] },
  { path: '/admin/reservations', role: 'admin', expect: [/reservation|guest/i] },
  { path: '/admin/reviews', role: 'admin', expect: [/review/i] },
  { path: '/admin/coupons', role: 'admin', expect: [/coupon|code|%|off/i] },
  { path: '/admin/content', role: 'admin', expect: [/content|block|hero/i] },
  { path: '/admin/gallery', role: 'admin', expect: [/photo|gallery|image/i] },
  { path: '/admin/faqs', role: 'admin', expect: [/faq|question/i] },
  { path: '/admin/media', role: 'admin', expect: [/media|upload|image/i] },
  { path: '/admin/subscribers', role: 'admin', expect: [/subscrib|newsletter/i] },
  { path: '/admin/messages', role: 'admin', expect: [/inbox|enquir|message/i] },
  { path: '/admin/activity', role: 'admin', expect: [/activity|log/i] },
  { path: '/admin/analytics', role: 'admin', expect: [/analytics|revenue|orders/i] },
  { path: '/admin/settings', role: 'admin', expect: [/settings|restaurant|tax|operations/i] },
  { path: '/nope-404', role: 'guest', expect: [/404|not found|lost/i] },
]

/* ── 1. bundle the real app for node ─────────────────────────────────────── */
const TMP = path.join(root, '.render-tmp')
fs.mkdirSync(TMP, { recursive: true })
const entry = path.join(TMP, 'entry.jsx')
fs.writeFileSync(
  entry,
  `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from ${JSON.stringify(path.join(root, 'src/App.jsx'))}
import { AuthProvider } from ${JSON.stringify(path.join(root, 'src/context/AuthContext.jsx'))}
import { ToastProvider } from ${JSON.stringify(path.join(root, 'src/context/ToastContext.jsx'))}
import { DataProvider } from ${JSON.stringify(path.join(root, 'src/context/MenuContext.jsx'))}
import { NotificationsProvider } from ${JSON.stringify(path.join(root, 'src/context/NotificationsContext.jsx'))}
import { CartProvider } from ${JSON.stringify(path.join(root, 'src/context/CartContext.jsx'))}
import { BrowserRouter } from 'react-router-dom'

export function mount(container) {
  const root = createRoot(container)
  root.render(
    React.createElement(BrowserRouter, null,
      React.createElement(ToastProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(DataProvider, null,
            React.createElement(NotificationsProvider, null,
              React.createElement(CartProvider, null,
                React.createElement(App, null))))))),
  )
  return root
}
`,
)

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  outfile: OUT,
  loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl' },
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env.DEV': 'true', 'import.meta.env.VITE_API_URL': '""' },
  absWorkingDir: root,
  logLevel: 'error',
  external: ['node:*'],
})

/* ── 2. jsdom environment ────────────────────────────────────────────────── */
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', () => {}) // jsdom has no scrollTo/IO — irrelevant to the render
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
  virtualConsole,
})
const { window } = dom

window.scrollTo = () => {}
window.scroll = () => {}
window.Element.prototype.scrollIntoView = () => {}
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.IntersectionObserver = ObserverStub
window.ResizeObserver = ObserverStub
globalThis.IntersectionObserver = ObserverStub
globalThis.ResizeObserver = ObserverStub

globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
Object.defineProperty(globalThis, 'location', { value: window.location, configurable: true, writable: true })
globalThis.history = window.history
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.MouseEvent = window.MouseEvent
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.CustomEvent = window.CustomEvent
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
window.matchMedia = globalThis.matchMedia
globalThis.IS_REACT_ACT_ENVIRONMENT = false

/** Route every relative /api call jsdom makes to the live server. */
const nodeFetch = globalThis.fetch
const sessionCookies = { current: '' }
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const absolute = url.startsWith('/') ? `${API}${url}` : url
  const headers = new Headers(init.headers || {})
  if (sessionCookies.current) headers.set('cookie', sessionCookies.current)
  const res = await nodeFetch(absolute, { ...init, headers, redirect: 'manual' })
  const setCookie = res.headers.getSetCookie?.() || []
  if (setCookie.length) {
    sessionCookies.current = setCookie.map((c) => c.split(';')[0]).join('; ')
  }
  return res
}
globalThis.fetch = window.fetch

const { mount } = await import(`file://${OUT}`)

/* ── 3. sign in helpers ──────────────────────────────────────────────────── */
async function signIn(email, password) {
  const res = await nodeFetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`)
  const setCookie = res.headers.getSetCookie?.() || []
  sessionCookies.current = setCookie.map((c) => c.split(';')[0]).join('; ')
}
async function signOut() {
  await nodeFetch(`${API}/api/auth/logout`, { method: 'POST', headers: { cookie: sessionCookies.current } })
  sessionCookies.current = ''
}

const CREDENTIALS = {
  admin: { email: 'admin@ember.pk', password: 'Password123!' },
  customer: { email: 'demo@ember.pk', password: 'Password123!' },
}

/** Sessions are cached per role: the API rate-limits /auth, and reusing a
 *  session is also closer to how a real user moves between pages. */
const sessionJar = {}
let activeRole = 'guest'

async function useRole(role) {
  const creds = CREDENTIALS[role]
  if (!creds) {
    await signOut()
    sessionJar.guest = sessionCookies.current
    activeRole = 'guest'
    return
  }
  if (sessionJar[role] && activeRole !== role) {
    sessionCookies.current = sessionJar[role]
    activeRole = role
    return
  }
  if (activeRole === role && sessionCookies.current) return
  await signIn(creds.email, creds.password)
  sessionJar[role] = sessionCookies.current
  activeRole = role
}

const problems = []
const rows = []

function watchConsole() {
  const errors = []
  const originalError = console.error
  const originalWarn = console.warn
  console.error = (...args) => {
    const text = args.map(String).join(' ')
    if (!/not wrapped in act|Warning: The width\(0\)/.test(text)) errors.push(text.slice(0, 240))
  }
  console.warn = () => {}
  return () => {
    console.error = originalError
    console.warn = originalWarn
    return errors
  }
}

async function renderRoute(route) {
  const restore = watchConsole()
  window.history.pushState({}, '', route.path)
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  let root
  try {
    root = mount(container)
  } catch (e) {
    restore()
    throw e
  }
  await new Promise((r) => setTimeout(r, 2200))
  const text = container.textContent || ''
  const html = container.innerHTML
  const skeletons = (html.match(/skeleton/g) || []).length
  const errors = restore()
  root.unmount()
  container.remove()
  return { text, html, skeletons, errors }
}

for (const route of ROUTES) {
  const role = route.role
  try {
    await useRole(role)
  } catch (e) {
    problems.push(`auth(${role}): ${e.message}`)
  }

  let result
  try {
    result = await renderRoute(route)
  } catch (e) {
    rows.push({ route: route.path, status: 'CRASH', detail: e.message.slice(0, 200) })
    problems.push(`${route.path}: crashed — ${e.message.slice(0, 200)}`)
    continue
  }

  const missing = route.expect.filter((re) => !re.test(result.text))
  const stuck = result.skeletons > 6
  const status = missing.length || result.errors.length || stuck ? 'CHECK' : 'OK'
  rows.push({
    route: route.path,
    role,
    status,
    chars: result.text.length,
    skeleton: result.skeletons,
    missing: missing.map(String),
    errors: result.errors.slice(0, 2),
    sample: result.text.replace(/\s+/g, ' ').trim().slice(0, 90),
  })
  if (status !== 'OK') {
    problems.push(
      `${route.path} [${role}] missing=${missing.map(String).join(',')} errors=${result.errors.slice(0, 2).join(' | ')} skeletons=${result.skeletons}`,
    )
  }
}

console.log('\n════ ROUTE RENDER CHECK ════')
for (const row of rows) {
  const flag = row.status === 'OK' ? '✓' : row.status === 'CRASH' ? '✗' : '!'
  console.log(
    `${flag} ${row.route.padEnd(28)} ${String(row.chars || 0).padStart(5)} chars  ${row.sample || row.detail || ''}`,
  )
  if (row.missing?.length) console.log(`    missing: ${row.missing.join(', ')}`)
  if (row.errors?.length) row.errors.forEach((e) => console.log(`    error: ${e}`))
  if (row.skeleton > 6) console.log(`    stuck loading: ${row.skeleton} skeletons`)
}

console.log('\n════ PROBLEMS ════')
console.log(problems.length ? problems.map((p) => ' - ' + p).join('\n') : 'none 🎉')

fs.rmSync(TMP, { recursive: true, force: true })
fs.rmSync(OUT, { force: true })
const ok = rows.filter((r) => r.status === 'OK').length
console.log(`\n${ok}/${rows.length} routes rendered cleanly`)
process.exit(problems.length ? 1 : 0)

# Ember & Sage — Premium Restaurant Ordering Platform (MERN)

A complete, production-structured restaurant ordering web application built on the **MERN stack**:
**MongoDB · Express · React 19 · Node.js**, with a fully integrated backend — every screen is wired
to live APIs, and all user progress persists to the account.

> Brand: **Ember & Sage** · Islamabad · "Good Food. Good Mood."
> Frontend: **Vite · React 19 · React Router 7 · Tailwind CSS v4 · Framer Motion · Lucide**
> Backend: **Express (ESM) · Mongoose · JWT (httpOnly cookie) · Nodemailer (optional SMTP)**

---

## 1. Running locally

```bash
npm install

npm run dev          # API (:4000) + web (:5173) together
npm run dev:server   # API only  → http://localhost:4000/api/health
npm run dev:web      # Vite only → http://localhost:5173 (proxies /api + /uploads)

npm run build        # production build → dist/
npm start            # single-process prod server (API serves dist/)
npm run seed         # re-seed demo data
```

No external MongoDB required — the API boots a **persistent local MongoDB** (`.data/mongodb`)
via `mongodb-memory-server`, or use `MONGODB_URI` for a real cluster. On first boot it seeds
users, menu, orders, coupons, reservations, reviews, settings and notifications.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ember.pk` | `Password123!` |
| Customer | `demo@ember.pk` | `Password123!` |

The customer comes pre-loaded with 2 addresses, a default Visa ••42, favorites, past orders
and notifications. **Promo codes:** `WELCOME10` (10%) · `SAGE20` (20% off $60+) · `FREESHIP`.

**Test cards:** any ≥15 digits (e.g. `4242 4242 4242 4242`) succeeds · card ending **`0002`**
is declined (402, exercises the failure path). COD → payment pending; online/card → paid.

**Emails:** with no SMTP configured, every send is logged to the `emaillogs` collection and
printed as `[email:dev] …` in the API console. Set `SMTP_HOST/PORT/USER/PASS` to send for real.

---

## 2. What's implemented (end-to-end)

### Customer
- Register / login / logout / forgot & reset password (JWT httpOnly cookie `es_token`, 7 days)
- Session restore via `GET /api/auth/me`; role-based route guards
- Menu browse/search/filter/sort against live `GET /api/menu` (+ categories with counts)
- Dish detail, recently-viewed tracking, favorites toggle (persisted to account)
- Cart: guest localStorage → **merged into account on login**; server-side hydration,
  totals, coupon validation (`POST /api/cart/coupon`), debounced sync with race guard
- Checkout: delivery/pickup · card/online/COD · **server-side re-pricing** (never trusts
  client totals), coupon re-check, mock payment capture (decline path included)
- Confirmation → **live tracking timeline** (`GET /api/orders/:id/tracking`)
- Account dashboard (all live APIs): profile, orders, favorites, addresses CRUD,
  payment methods (tokenized — last 4 only), preferences & password change
- Reservations & contact forms → stored + confirmation email logged
- Notifications center fed by order/reservation events

### Admin (`/admin`, admin role enforced by middleware → 403 for customers)
- Dashboard: today's orders/revenue/pending/customers, 7-day series, popular dishes,
  category donut, recent orders with inline status changes (customer notified)
- Orders: search + status filter, detail modal, status workflow
  `Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered / Cancelled`
- Menu CRUD with **multipart image upload** (served from `/uploads`), availability toggle
- Categories CRUD (guarded against deleting in-use categories)
- Customers (derived from orders), Reservations, Reviews (publish/hide/reply),
  Coupons CRUD (live at checkout), Analytics (live series), Settings (storefront + ops flags)

### Cross-cutting
- Non-happy-path states everywhere (skeletons, empty, 401/403/404/409/410/402/422/500)
- Accessibility: labelled inputs, focus rings, keyboard nav, `aria-*` on toggles/tabs/steppers,
  status never by color alone (icon + text)
- Responsive at 1440 / 1280 / 768 / 390; subtle Framer Motion reveals & micro-interactions
- SEO: unique `<title>` per route, meta description, OG/Twitter tags, JSON-LD
  (`Restaurant` + `Menu`), semantic landmarks

---

## 3. API surface

Base URL: `/api` (proxied in dev; same-origin in prod). All auth via cookie or `Bearer`.

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register` `login` `logout` `forgot` `reset` · `GET /auth/me` |
| Users | `PATCH /users/me` `me/password` `me/preferences` · addresses CRUD · `favorites` toggle · payment-methods CRUD `:id/default` · `POST me/viewed/:id` · `GET me/recently-viewed` |
| Menu | `GET /menu?category&search&sort` · `GET /menu/categories` · `GET /menu/:id` · admin: `POST /menu` `PUT /menu/:id` `PATCH /menu/:id/availability` `DELETE /menu/:id` (multipart `image`) · categories CRUD |
| Cart | `GET /cart` · `PUT /cart` (replace + hydrate) · `POST /cart/merge` · `DELETE /cart` · `POST /cart/coupon` |
| Orders | `POST /orders` (re-price, charge, notify) · `GET /orders/mine` · `GET /orders/:id` · `GET /orders/:id/tracking` |
| Public | `GET|POST /reviews` · `POST /reservations` · `GET /reservations/mine` · `POST /contact` · `GET /settings` · `POST /coupons/preview` |
| Admin | notifications list/read · `GET /admin/stats` · `GET|PATCH /admin/orders…` · `customers` · `reservations` · `reviews` · `coupons` CRUD · `PATCH /admin/settings` · `categories` |
| Static | `/uploads/*` (dish images) |

### Pricing rules (shared client/server)
- Tax **10%** on (subtotal − discount) · delivery **$3.50**, free ≥ **$50**
- Sizes: Regular / Large **+$4** · Add-ons: cheese **$2**, sauce **$1.50**, toppings **$2.50**

---

## 4. Screen inventory

| Route | Screen |
|---|---|
| `/` | Landing: hero, value band, categories, chef's favorites, story, gallery teaser, reviews carousel, reservation, contact |
| `/menu` | Full menu — search, category tabs, sort, skeletons, empty state |
| `/menu/:id` | Food detail — sizes, add-ons, notes, qty, ingredients, related, favorites |
| `/login` `/register` `/forgot-password` `/reset-password` | Auth suite with validation + confirmation states |
| `/cart` | Cart page (drawer also available from navbar) + async coupon + summary |
| `/checkout` | 4-step indicator · info/delivery/pickup · payment · server-priced order |
| `/order-confirmed` | Success animation, receipt card, email note, track CTA |
| `/track/:id` | Live status timeline, progress bar, ETA, items, restaurant info |
| `/account/*` | Profile, Orders (view/reorder), Favorites, Addresses, Payments, Settings |
| `/about` `/gallery` `/contact` `/reservations` | Story, masonry gallery + lightbox, contact form + map, reservation flow |
| `/admin/*` | Dashboard, Orders, Menu, Categories, Customers, Reservations, Reviews, Coupons, Analytics, Settings |
| `*` | 404 empty state |

---

## 5. Design system

**Color tokens** (Tailwind v4 `@theme` in `src/index.css`):

| Token | Value | Role |
|---|---|---|
| `ink` | `#17140F` | Deep warm charcoal — text, dark surfaces |
| `cream` | `#FBF7F0` | Page background |
| `beige` / `sand` | `#F2EADB` / `#E7DCC9` | Supporting surfaces |
| `clay` | `#C0522F` | Terracotta accent — CTAs, highlights |
| `olive` | `#5F6F45` | Secondary — dietary/positive |
| `warm` | `#8C8375` | Muted text |
| `danger` / `success` / `warning` | `#B3402E` / `#4A7C48` / `#C98A1B` | Status (always with icon + text) |

Type: **Fraunces** (display serif) + **Inter** (UI sans) via `@fontsource`.

---

## 6. Data model (15 collections)

`User` (roles, favorites, recentlyViewed, preferences, paymentMethods, resetToken) ·
`Address` · `Category` · `MenuItem` (slug, featured, available, rating) ·
`Cart` (user-unique, coupon snapshot) · `Order` (sequence `orderNumber`, totals, payment &
fulfillment, status workflow) · `Payment` · `Reservation` · `Review` · `Coupon` ·
`Notification` · `Counter` (order number sequence) · `Setting` (restaurant singleton) ·
`ContactMessage` · `EmailLog` (dev outbox).

---

## 7. Testing

```bash
node smoke.mjs   # 20-route crawl — console-error gate (frontend)
node flow.mjs    # Full E2E: login → cart → coupon → checkout → order → tracking →
                 # account (×6) → admin guard → dashboard → menu CRUD → orders table
```

Latest `flow.mjs` run: **22/22 steps passing** against the live API (orders created,
server-validated coupons, admin 403 enforcement, live stats).

---

## 8. Project structure

```
ember-sage/
├── server/src/
│   ├── index.js            # Express bootstrap, mounts /api/* + dist in prod
│   ├── config/db.js        # MONGODB_URI or persistent MongoMemoryServer (.data/mongodb)
│   ├── models/index.js     # 15 Mongoose models + nextOrderNumber()
│   ├── middleware/         # auth (JWT cookie), errors, multer upload
│   ├── routes/             # auth users menu cart orders public admin
│   ├── utils/              # pricing, email templates, seed
│   └── uploads/            # uploaded dish images (served at /uploads)
├── src/
│   ├── components/         # ui · layout · menu · home · admin (charts)
│   ├── context/            # Auth · Cart · Data(menu/settings) · Notifications · Toast
│   ├── pages/              # storefront, account, auth, admin/
│   ├── data/               # seed-time menu/categories/coupons/site copy
│   ├── lib/api.js          # fetch wrapper (cookies, FormData, ApiError)
│   └── index.css           # Tailwind @theme design tokens
├── vite.config.js          # host 0.0.0.0, /api + /uploads proxy, watcher ignores
├── flow.mjs · smoke.mjs    # Playwright E2E + smoke
└── shots/                  # test screenshots
```

### Environment (optional)

```bash
JWT_SECRET=…        # token signing (dev default otherwise)
MONGODB_URI=…       # external MongoDB
SMTP_HOST=… SMTP_PORT=587 SMTP_USER=… SMTP_PASS=…   # real emails
SEED=false          # skip auto-seed on boot · SEED=force-clear wipes & re-seeds
API_URL=…           # proxy target for vite dev
```

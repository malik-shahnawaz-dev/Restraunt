# Ember &amp; Sage — restaurant ordering platform

A complete, end-to-end restaurant product: a guest-facing storefront, a logged-in
customer account, and a full admin/CMS back office — all backed by a real API and
database. No mock data paths remain: every number, image, price, review and
order you see is read from and written to the server.

```
ember-sage/
├─ server/                 Express 5 + Mongoose API
│  ├─ src/db/             lite.js  — Mongoose-compatible ODM on node:sqlite
│  │                      orm.js   — single switch: MongoDB when MONGODB_URI is set, SQLite otherwise
│  ├─ src/models/         User, MenuItem, Category, Order, Payment, Reservation,
│  │                      Review, Coupon, Address, Notification, ContactMessage,
│  │                      Content, GalleryImage, Faq, Subscriber, MediaAsset, Setting, AuditLog
│  ├─ src/routes/         auth · users · menu · cart · orders · public · admin · cms
│  ├─ src/utils/          seed (≈100 demo orders over 30 days) · pricing · email · audit · defaultContent
│  └─ test/api.test.mjs   134 end-to-end HTTP assertions
├─ src/                    React 19 + Vite storefront & admin
│  ├─ context/            Auth · Data (menu/settings/CMS) · Cart · Notifications · Toast
│  ├─ pages/              Home, Menu, Dish, Cart, Checkout, Tracking, About, Gallery,
│  │                      Contact, Reservations, Account/*, admin/*
│  └─ lib/api.js          cookie-session fetch wrapper
└─ scripts/render-harness.mjs   jsdom render check for all 35 routes
```

## Quick start

```bash
npm install
npm run dev          # API on :4000, Vite on :5173
```

The first boot seeds the database (settings, admin + demo customers, 7 categories,
18 dishes, coupons, CMS content, gallery, FAQs, reviews, reservations and ~100
orders spanning the last 30 days). Nothing else to configure — with no `.env`
the app runs on SQLite via `node:sqlite`.

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@ember.pk` | `Password123!` |
| Customer | `demo@ember.pk` | `Password123!` |

```bash
npm run seed        # top up anything missing
npm run db:reset    # wipe and re-seed from scratch
npm run build       # production bundle
npm start           # serve the built frontend + API from :4000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API (`node --watch`) + Vite dev server with `/api` proxy |
| `npm run dev:server` / `dev:web` | run either half on its own |
| `npm run seed` / `db:reset` | seed / wipe-and-seed the database |
| `npm run build` | production frontend build (served by the API in production) |
| `npm start` | production: Express serves `dist/` **and** the API |
| `npm run test:api` | 134 HTTP tests against a running server |
| `npm run test:render` | mounts all 35 routes in jsdom against the live API |

## Database

The models are written against Mongoose. Two engines back them:

* `MONGODB_URI` set → real MongoDB, exactly as written.
* otherwise → `server/src/db/lite.js`, a small Mongoose-compatible ODM on top of
  `node:sqlite` (queries, populate, sort, aggregation helpers and hooks). Same
  code, same models, zero external services — handy for local work, CI and
  demos. Switching engines needs no code change.

## What the customer can do

* Browse the menu, categories, dishes (with live availability, search, sorting,
  per-dish reviews you can write yourself) and a “pick up where you left off”
  strip built from the dishes your account opened most recently.
* Register, log in, log out, reset a password; sessions survive reloads
  (httpOnly cookie) and a guest cart merges into the account on login.
* Keep a server-side cart with live delivery fee, tax, free-delivery threshold
  and coupon rules — pricing is always recomputed on the server.
* Check out with card (any card ending `0000` is declined, so the failure path
  is demonstrable) or cash on delivery; receive an order confirmation and a
  tracking page with a live status timeline.
* Cancel or reorder a past order, review a delivered one, and print a receipt.
* Account area: overview with loyalty tier and points, order history,
  reservations (with cancel), favorites, saved addresses, saved payment methods,
  notification inbox, preferences, password change, account deletion.
* Reserve a table (pre-filled when signed in) and contact the restaurant.

Everything above is stored against the user account — recently viewed dishes,
favorites, addresses, payment methods, orders, loyalty and notifications all
round-trip to the API, so progress follows the user across devices.

## What the admin can do

* **Dashboard** — live revenue, orders, AOV, customers, low-stock and
  pending items.
* **Orders** — filter, inspect, move through statuses, refund, cancel.
* **Menu & categories** — CRUD with image upload and availability toggling.
* **Customers** — profiles, loyalty, spend, block/unblock, order history.
* **Reservations**, **Reviews** (publish/hide/feature/reply), **Coupons**.
* **Content (CMS)** — every headline, image, stat list and CTA on the site,
  grouped by page, with structured JSON repeaters and “restore defaults”.
* **Gallery**, **FAQs**, **Media library** (uploads served from `/uploads`),
  **Newsletter subscribers**, **Inbox** (contact-form enquiries with
  read/archive), **Activity log** (every admin write is audited).
* **Analytics** — 7/30/90-day revenue and order series, peak hours, category
  share, top dishes, payment/fulfillment/status mix, all computed from orders.
* **Settings** — profile, hours, fees, tax and maintenance mode (the storefront
  returns `503` while maintenance is on).

## API surface

All routes are mounted under `/api`. Cookies carry the session
(`credentials: include`).

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register` `/login` `/logout` `/forgot` `/reset`, `GET /auth/me` |
| Catalog | `GET /menu` (filters, search, sort), `/menu/:id`, `/menu/categories`, `/settings`, `/stats`, `/reviews` |
| CMS (public) | `GET /content`, `/content/:key`, `/gallery`, `/faqs`, `/coupons`, `POST /subscribers`, `POST /reviews` |
| Cart | `GET/PUT /cart`, `POST /cart/coupon`, `POST /cart/merge` |
| Orders | `POST /orders`, `GET /orders/mine`, `GET /orders/:id/tracking`, `POST /orders/:id/cancel` `/reorder` `/review` |
| Reservations | `POST /reservations`, `GET /reservations/mine`, `PATCH /reservations/:id/cancel` |
| Account | `GET/PATCH /users/me`, `me/summary`, `me/addresses`, `me/favorites`, `me/payment-methods`, `me/notifications`, `me/recently-viewed`, `me/preferences`, `me/password`, `me/avatar`, `DELETE /users/me` |
| Admin | `/admin/dashboard-orders`, `orders`, `menu`, `categories`, `customers`, `reservations`, `reviews`, `coupons`, `analytics`, `stats`, `settings`, `messages`, `audit-logs` (all admin-only) |
| Admin CMS | `/admin/content`, `gallery`, `faqs`, `media`, `subscribers` |

## Tests

```bash
npm run dev         # in one terminal
npm run test:api    # 134 assertions: guest → cart → coupon → checkout →
                    # tracking → cancel/reorder → review, account, admin CMS,
                    # maintenance mode, account lifecycle
npm run test:render # every route mounts and renders live data
```

`test:render` exists because no browser binary is installable in every
environment: it bundles the real React tree with esbuild and mounts it in jsdom
against the live API, failing on any render error, stuck skeleton or empty page.

## Configuration

Copy `.env.example` to `.env`. Everything has a working default; the only values
you must change for a real deployment are `JWT_SECRET`, `CORS_ORIGIN` and
(preferably) `MONGODB_URI`. Emails fall back to a dev outbox (stored in the
`EmailLog` collection and printed to the console) whenever SMTP is not set.

## Security & operations

`helmet` (CSP tuned for the upload previews), `compression`, `morgan`,
`express-rate-limit` (tighter on `/api/auth`), CORS with credentials,
httpOnly session cookies, bcrypt password hashing, ownership checks on every
account-scoped route, an audit log of admin writes, uploads restricted to
images under 5 MB, and a React error boundary so a render fault shows a
recovery screen instead of a blank page.

## Known limits

* Payments are a sandbox: card numbers ending `0000` are declined on purpose,
  and no real gateway is charged.
* Email falls back to the dev outbox unless SMTP is configured.
* `flow.mjs` / `smoke.mjs` are Playwright scripts kept for environments that
  can install a browser; `npm run test:render` is the check that runs anywhere.

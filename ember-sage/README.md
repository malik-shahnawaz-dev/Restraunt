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

## Run it locally — step by step

### 1. Prerequisites

* **Node.js ≥ 22.5** (the API uses the built-in `node:sqlite`; check with `node -v`)
* **npm** (ships with Node)
* Optional: **MongoDB** if you want to run on Mongo instead of SQLite

### 2. Get the code and install

```bash
git clone https://github.com/malik-shahnawaz-dev/Restraunt.git
cd Restraunt/ember-sage
npm install
```

### 3. Create your `.env`

```bash
cp .env.example .env
```

Everything has a working default, so **the app runs with no `.env` at all**
(SQLite + seeded demo data + dev outbox for email). Fill in:

| Variable | Why |
| --- | --- |
| `SMTP_USER` / `SMTP_PASS` | real emails (see [Email](#email-smtp) below) |
| `MAIL_TO` | where contact-form enquiries and table requests are delivered |
| `JWT_SECRET` | any long random string — change it for anything public |
| `MONGODB_URI` | only if you want MongoDB instead of SQLite |

### 4. Start the two servers

```bash
npm run dev
```

This runs **both** processes (via `concurrently`):

| Process | Command | URL |
| --- | --- | --- |
| API | `npm run dev:server` | <http://localhost:4000> (health: `/api/health`) |
| Frontend | `npm run dev:web` | <http://localhost:5173> |

Vite proxies `/api` and `/uploads` to the API, so the browser only ever talks to
`:5173`. Keep this terminal open; file changes hot-reload on both sides.

Prefer separate terminals?

```bash
npm run dev:server     # terminal 1 — API on :4000
npm run dev:web        # terminal 2 — Vite on :5173
```

### 5. Sign in

The first boot seeds everything (settings, admin + demo customers, 7 categories,
18 dishes, coupons, CMS content, gallery, FAQs, reviews, reservations and ~100
orders across the last 30 days).

| Account | Email | Password | Where |
| --- | --- | --- | --- |
| Admin | `admin@ember.pk` | `Password123!` | <http://localhost:5173/admin> |
| Customer | `demo@ember.pk` | `Password123!` | <http://localhost:5173/login> |

### 6. Everyday commands

```bash
npm run seed        # top up anything missing
npm run db:reset    # wipe and re-seed from scratch
npm run test:api    # 139 HTTP tests (needs the server running)
npm run test:render # mount all 36 routes against the live API
npm run mail:test   # check the email pipeline
npm run build       # production bundle into dist/
npm start           # production: Express serves dist/ + the API on :4000
```

### 7. Production mode (single process)

```bash
npm run build
npm start           # http://localhost:4000 — frontend and API together
```

---

## Email (SMTP)

Real emails are sent through Nodemailer as soon as `SMTP_HOST` **and**
`SMTP_PASS` are set; until then every message is written to the `EmailLog`
collection and printed to the API console, so nothing breaks.

**Gmail setup (3 minutes)**

1. Turn on **2-Step Verification** for the Google account.
2. Google Account → **Security** → search **App passwords** → create one for
   *Mail / Other (Ember & Sage)*.
3. In `.env`:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=you@gmail.com
   SMTP_PASS=abcdefghijklmnop      # the 16-char App Password, no spaces
   MAIL_TO=you@gmail.com           # enquiries + table requests land here
   ```

4. Restart the API (`npm run dev`). You will see
   `[email] SMTP ready → smtp.gmail.com:587 as you@gmail.com`.
5. Verify without placing an order:

   ```bash
   npm run mail:test -- --live --to you@gmail.com
   ```

The From address defaults to the authenticated account unless you set
`MAIL_FROM`, because Gmail rejects senders it cannot verify.

**What sends email**

| Trigger | To |
| --- | --- |
| Order placed | the customer — full receipt with items, totals and ETA |
| Order status changes / delivered / cancelled | the customer |
| Registration | the customer (welcome) |
| Password reset | the customer (reset link) |
| Contact form | `MAIL_TO` (reply goes to the guest) **and** an acknowledgement to the guest |
| Table reservation | the guest **and** `MAIL_TO` |
| Newsletter signup | the subscriber |

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API (`node --watch`) + Vite dev server with `/api` proxy |
| `npm run dev:server` / `dev:web` | run either half on its own |
| `npm run seed` / `db:reset` | seed / wipe-and-seed the database |
| `npm run build` | production frontend build (served by the API in production) |
| `npm start` | production: Express serves `dist/` **and** the API |
| `npm run test:api` | 134 HTTP tests against a running server |
| `npm run test:render` | mounts all 36 routes in jsdom against the live API |
| `npm run mail:test` | sends every email template through a local SMTP sink (add `--live --to you@example.com` to use real SMTP) |

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
you must change for a real deployment are `JWT_SECRET`, `CORS_ORIGIN`,
`SMTP_USER`/`SMTP_PASS` (for real email) and, preferably, `MONGODB_URI`.

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
* Email is delivered for real as soon as `SMTP_HOST` + `SMTP_PASS` are set
  (see [Email](#email-smtp)); without them it uses the dev outbox.
* `flow.mjs` / `smoke.mjs` are Playwright scripts kept for environments that
  can install a browser; `npm run test:render` is the check that runs anywhere.

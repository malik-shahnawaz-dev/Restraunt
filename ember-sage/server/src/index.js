import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { connectDB } from './config/db.js'
import { notFound, errorHandler } from './middleware/error.js'
import { UPLOAD_DIR } from './middleware/upload.js'
import { runSeed } from './utils/seed.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import menuRoutes from './routes/menu.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'
import { publicRouter as cmsPublic, adminRouter as cmsAdmin } from './routes/cms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 4000

const app = express()

app.set('trust proxy', true)
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }))
app.use(
  helmet({
    // The admin panel uploads and previews images straight from /uploads.
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'connect-src': ["'self'", 'https:', 'http://localhost:*', 'ws://localhost:*', 'wss://localhost:*'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(compression())
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/**
 * Brute-force protection on the credential endpoints (login, register, reset).
 * Reads such as `GET /auth/me` are not limited — the app calls it on every boot.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts — please try again in a few minutes.' },
  skip: (req) =>
    req.method === 'GET' || process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
})
/** Generous ceiling for the rest of the API so the preview can never be DoS'd by accident. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
})

// Uploaded dish images (CMS)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ember-sage-api', time: new Date().toISOString() }))

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/users', apiLimiter, userRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin', cmsAdmin) // CMS: content, gallery, FAQs, subscribers, media, audit log
// public routes mount after menu so /api/menu/categories wins
app.use('/api', cmsPublic)
app.use('/api', publicRoutes)

// Production: serve the built frontend
const dist = path.resolve(__dirname, '../../dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use(notFound)
app.use(errorHandler)

connectDB()
  .then(async () => {
    if (process.env.SEED !== 'false') await runSeed()
    app.listen(PORT, '0.0.0.0', () => console.log(`[api] Ember & Sage API listening on http://0.0.0.0:${PORT}`))
  })
  .catch((err) => {
    console.error('[api] failed to start:', err)
    process.exit(1)
  })

import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import {
  Content,
  GalleryImage,
  Faq,
  Subscriber,
  MediaAsset,
  AuditLog,
  MenuItem,
  Review,
  Coupon,
} from '../models/index.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { upload } from '../middleware/upload.js'
import { UPLOAD_DIR } from '../middleware/upload.js'
import { DEFAULT_CONTENT, DEFAULT_GALLERY, DEFAULT_FAQS } from '../utils/defaultContent.js'
import { logAudit } from '../utils/audit.js'
import { sendEmail } from '../utils/email.js'

/* ═════════════════════════ Public CMS routes ═════════════════════════
   Everything the storefront renders outside of the menu/orders lives here:
   copy blocks, gallery, FAQs and the newsletter. All of it is editable from
   the admin panel and stored in the database.                              */

export const publicRouter = Router()

/** All active content blocks keyed by their slug, e.g. { "home.hero": {...} } */
publicRouter.get('/content', async (_req, res, next) => {
  try {
    const blocks = await Content.find({ active: true }).sort({ sortOrder: 1 })
    const content = {}
    for (const block of blocks) content[block.key] = block
    res.json({ content, blocks })
  } catch (e) {
    next(e)
  }
})

publicRouter.get('/content/:key', async (req, res, next) => {
  try {
    const block = await Content.findOne({ key: String(req.params.key).toLowerCase() })
    if (!block) throw new ApiError(404, 'Content block not found.')
    res.json({ block })
  } catch (e) {
    next(e)
  }
})

publicRouter.get('/gallery', async (req, res, next) => {
  try {
    const filter = req.query.active === 'false' ? {} : { active: true }
    if (req.query.category) filter.category = req.query.category
    const gallery = await GalleryImage.find(filter).sort({ sortOrder: 1 })
    res.json({ gallery })
  } catch (e) {
    next(e)
  }
})

publicRouter.get('/faqs', async (req, res, next) => {
  try {
    const filter = req.query.active === 'false' ? {} : { active: true }
    const faqs = await Faq.find(filter).sort({ sortOrder: 1 })
    res.json({ faqs })
  } catch (e) {
    next(e)
  }
})

/** Newsletter signup (footer / checkout). Idempotent — re-subscribing is a no-op. */
publicRouter.post('/subscribers', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.')
    const existing = await Subscriber.findOne({ email })
    if (existing) {
      if (!existing.active) {
        existing.active = true
        existing.unsubscribedAt = undefined
        await existing.save()
      }
      return res.json({ message: 'You’re already on the list — see you in your inbox!', subscriber: existing })
    }
    const subscriber = await Subscriber.create({ email, source: req.body.source || 'footer' })
    sendEmail({
      to: email,
      subject: 'You’re on the list — welcome to Ember & Sage',
      template: 'newsletter',
      html: `<div style="font-family:Georgia,serif;padding:24px;color:#17140F"><h2>Welcome to Ember &amp; Sage</h2><p>Thanks for subscribing! Expect seasonal menus, chef’s specials and members-only offers — no spam, just flavor.</p></div>`,
    })
    res.status(201).json({ message: 'You’re subscribed. Watch your inbox for something delicious.', subscriber })
  } catch (e) {
    next(e)
  }
})

publicRouter.post('/subscribers/unsubscribe', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim()
    const subscriber = await Subscriber.findOne({ email })
    if (!subscriber) throw new ApiError(404, 'That email isn’t subscribed.')
    subscriber.active = false
    subscriber.unsubscribedAt = new Date()
    await subscriber.save()
    res.json({ message: 'You’ve been unsubscribed.' })
  } catch (e) {
    next(e)
  }
})

/** Publicly advertised promo codes (managed in Admin → Coupons). */
publicRouter.get('/coupons', async (_req, res, next) => {
  try {
    const coupons = await Coupon.find({ active: true }).sort({ createdAt: -1 })
    res.json({
      coupons: coupons.map((c) => ({
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        label: c.label || '',
        remaining: Math.max(0, c.usageLimit - c.used),
      })),
    })
  } catch (e) {
    next(e)
  }
})

/** Live site stats used on the home page (rating, dish count, happy customers…). */
publicRouter.get('/stats', async (_req, res, next) => {
  try {
    const [dishCount, reviewAgg] = await Promise.all([
      MenuItem.countDocuments({ available: true }),
      Review.aggregate([{ $match: { status: 'published' } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ])
    res.json({
      dishes: dishCount,
      rating: Math.round((reviewAgg[0]?.avg || 4.9) * 10) / 10,
      reviewCount: reviewAgg[0]?.count || 0,
    })
  } catch (e) {
    next(e)
  }
})

/* ═════════════════════════ Admin CMS routes ═════════════════════════ */

export const adminRouter = Router()
adminRouter.use(protect, adminOnly)

const CONTENT_FIELDS = ['title', 'subtitle', 'eyebrow', 'body', 'image', 'ctaLabel', 'ctaHref', 'data', 'active', 'sortOrder', 'group']

adminRouter.get('/content', async (_req, res, next) => {
  try {
    const blocks = await Content.find().sort({ group: 1, sortOrder: 1 })
    res.json({ blocks })
  } catch (e) {
    next(e)
  }
})

adminRouter.put('/content/:key', async (req, res, next) => {
  try {
    const key = String(req.params.key).toLowerCase()
    let block = await Content.findOne({ key })
    if (!block) {
      block = await Content.create({ key, group: req.body.group || key.split('.')[0], ...pick(req.body, CONTENT_FIELDS) })
      await logAudit(req, 'create', 'content', `Created content block “${key}”`, block._id)
      return res.status(201).json({ block })
    }
    for (const field of CONTENT_FIELDS) if (req.body[field] !== undefined) block[field] = req.body[field]
    block.updatedBy = req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined
    await block.save()
    await logAudit(req, 'update', 'content', `Updated content block “${key}”`, block._id)
    res.json({ block })
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/content/restore-defaults', async (req, res, next) => {
  try {
    for (const defaults of DEFAULT_CONTENT) {
      const key = defaults.key
      const existing = await Content.findOne({ key })
      if (existing) {
        for (const [field, value] of Object.entries(defaults)) existing[field] = value
        existing.active = defaults.active !== false
        await existing.save()
      } else {
        await Content.create({ ...defaults, active: defaults.active !== false })
      }
    }
    await logAudit(req, 'restore', 'content', 'Restored default content blocks')
    const blocks = await Content.find().sort({ group: 1, sortOrder: 1 })
    res.json({ blocks, message: 'Default content restored.' })
  } catch (e) {
    next(e)
  }
})

/* ——— Gallery ——— */
adminRouter.get('/gallery', async (_req, res, next) => {
  try {
    const gallery = await GalleryImage.find().sort({ sortOrder: 1 })
    res.json({ gallery })
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/gallery', upload.single('image'), async (req, res, next) => {
  try {
    const { title, caption, category, sortOrder, image } = req.body
    if (!title) throw new ApiError(400, 'Give the photo a title.')
    const src = req.file ? `/uploads/${req.file.filename}` : image
    if (!src) throw new ApiError(400, 'Choose an image file or paste an image URL.')
    const item = await GalleryImage.create({
      title,
      caption: caption || '',
      image: src,
      category: category || 'Interior',
      sortOrder: Number(sortOrder) || 0,
      active: req.body.active === undefined ? true : req.body.active === 'true' || req.body.active === true,
    })
    await logAudit(req, 'create', 'gallery', `Added gallery photo “${title}”`, item._id)
    res.status(201).json({ item })
  } catch (e) {
    next(e)
  }
})

adminRouter.put('/gallery/:id', upload.single('image'), async (req, res, next) => {
  try {
    const item = await GalleryImage.findById(req.params.id)
    if (!item) throw new ApiError(404, 'Photo not found.')
    const { title, caption, category, sortOrder, image, active } = req.body
    if (title != null) item.title = title
    if (caption != null) item.caption = caption
    if (category != null) item.category = category
    if (sortOrder != null) item.sortOrder = Number(sortOrder)
    if (active != null) item.active = active === 'true' || active === true
    if (req.file) item.image = `/uploads/${req.file.filename}`
    else if (image) item.image = image
    await item.save()
    res.json({ item })
  } catch (e) {
    next(e)
  }
})

adminRouter.delete('/gallery/:id', async (req, res, next) => {
  try {
    const item = await GalleryImage.findById(req.params.id)
    if (!item) throw new ApiError(404, 'Photo not found.')
    await item.deleteOne()
    await logAudit(req, 'delete', 'gallery', `Removed gallery photo “${item.title}”`, item._id)
    res.json({ message: 'Photo removed' })
  } catch (e) {
    next(e)
  }
})

/* ——— FAQs ——— */
adminRouter.get('/faqs', async (_req, res, next) => {
  try {
    const faqs = await Faq.find().sort({ sortOrder: 1 })
    res.json({ faqs })
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/faqs', async (req, res, next) => {
  try {
    const { question, answer, category, sortOrder } = req.body
    if (!question || !answer) throw new ApiError(400, 'Both a question and an answer are required.')
    const faq = await Faq.create({
      question,
      answer,
      category: category || 'General',
      sortOrder: Number(sortOrder) || 0,
      active: req.body.active === undefined ? true : Boolean(req.body.active),
    })
    await logAudit(req, 'create', 'faq', `Added FAQ “${question}”`, faq._id)
    res.status(201).json({ faq })
  } catch (e) {
    next(e)
  }
})

adminRouter.put('/faqs/:id', async (req, res, next) => {
  try {
    const faq = await Faq.findById(req.params.id)
    if (!faq) throw new ApiError(404, 'FAQ not found.')
    const { question, answer, category, sortOrder, active } = req.body
    if (question != null) faq.question = question
    if (answer != null) faq.answer = answer
    if (category != null) faq.category = category
    if (sortOrder != null) faq.sortOrder = Number(sortOrder)
    if (active != null) faq.active = Boolean(active)
    await faq.save()
    res.json({ faq })
  } catch (e) {
    next(e)
  }
})

adminRouter.delete('/faqs/:id', async (req, res, next) => {
  try {
    await Faq.deleteOne({ _id: req.params.id })
    res.json({ message: 'FAQ deleted' })
  } catch (e) {
    next(e)
  }
})

/* ——— Subscribers ——— */
adminRouter.get('/subscribers', async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.status === 'active') filter.active = true
    if (req.query.status === 'inactive') filter.active = false
    if (req.query.q) filter.email = new RegExp(String(req.query.q), 'i')
    const subscribers = await Subscriber.find(filter).sort({ createdAt: -1 }).limit(500)
    const total = await Subscriber.countDocuments()
    const active = await Subscriber.countDocuments({ active: true })
    res.json({ subscribers, total, active })
  } catch (e) {
    next(e)
  }
})

adminRouter.patch('/subscribers/:id', async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id)
    if (!subscriber) throw new ApiError(404, 'Subscriber not found.')
    subscriber.active = req.body.active == null ? !subscriber.active : Boolean(req.body.active)
    subscriber.unsubscribedAt = subscriber.active ? undefined : new Date()
    await subscriber.save()
    res.json({ subscriber })
  } catch (e) {
    next(e)
  }
})

adminRouter.delete('/subscribers/:id', async (req, res, next) => {
  try {
    await Subscriber.deleteOne({ _id: req.params.id })
    res.json({ message: 'Subscriber removed' })
  } catch (e) {
    next(e)
  }
})

/* ——— Media library ——— */
adminRouter.get('/media', async (_req, res, next) => {
  try {
    const assets = await MediaAsset.find().sort({ createdAt: -1 }).limit(300)
    res.json({ assets })
  } catch (e) {
    next(e)
  }
})

adminRouter.post('/media', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'Choose an image to upload.')
    const asset = await MediaAsset.create({
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
    })
    await logAudit(req, 'upload', 'media', `Uploaded ${req.file.originalname}`, asset._id)
    res.status(201).json({ asset })
  } catch (e) {
    next(e)
  }
})

adminRouter.delete('/media/:id', async (req, res, next) => {
  try {
    const asset = await MediaAsset.findById(req.params.id)
    if (!asset) throw new ApiError(404, 'Asset not found.')
    const file = path.join(UPLOAD_DIR, asset.filename)
    if (file.startsWith(UPLOAD_DIR) && fs.existsSync(file)) fs.unlinkSync(file)
    await asset.deleteOne()
    res.json({ message: 'Asset deleted' })
  } catch (e) {
    next(e)
  }
})

/* ——— Audit trail ——— */
adminRouter.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(Number(req.query.limit) || 100)
    res.json({ logs })
  } catch (e) {
    next(e)
  }
})

function pick(source, fields) {
  const out = {}
  for (const field of fields) if (source[field] !== undefined) out[field] = source[field]
  return out
}

export default publicRouter

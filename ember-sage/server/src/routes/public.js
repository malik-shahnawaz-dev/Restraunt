import { Router } from 'express'
import {
  Review,
  Reservation,
  ContactMessage,
  Setting,
  MenuItem,
  Coupon,
} from '../models/index.js'
import { protect, optionalProtect } from '../middleware/auth.js'
import { Types } from '../db/orm.js'
import { ApiError } from '../middleware/error.js'
import { sendEmail, templates, RESTAURANT_INBOX } from '../utils/email.js'
import { computeTotals } from '../utils/pricing.js'
import { logAudit } from '../utils/audit.js'

const router = Router()

/* ———————— Reviews ———————— */
router.get('/reviews', async (req, res, next) => {
  try {
    const q = { status: 'published' }
    if (req.query.menuItem) q.menuItem = req.query.menuItem
    const reviews = await Review.find(q).sort({ date: -1 }).limit(Number(req.query.limit) || 20)
    res.json({ reviews })
  } catch (e) {
    next(e)
  }
})

router.post('/reviews', protect, async (req, res, next) => {
  try {
    const { rating, text, menuItemId, dish } = req.body
    if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be between 1 and 5.')
    if (!text || String(text).trim().length < 10) throw new ApiError(400, 'Please write at least 10 characters.')
    const review = await Review.create({
      user: req.user._id,
      menuItem: menuItemId || undefined,
      name: `${req.user.firstName} ${req.user.lastName}`,
      initials: (req.user.firstName[0] || '') + (req.user.lastName[0] || ''),
      rating: Number(rating),
      text: String(text).trim(),
      dish: dish || undefined,
    })
    if (menuItemId) await recalcRating(menuItemId)
    res.status(201).json({ review })
  } catch (e) {
    next(e)
  }
})

async function recalcRating(menuItemId) {
  const agg = await Review.aggregate([
    { $match: { menuItem: new Types.ObjectId(menuItemId), status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (agg[0]) {
    await MenuItem.findByIdAndUpdate(menuItemId, {
      rating: Math.round(agg[0].avg * 10) / 10,
      reviewCount: agg[0].count,
    })
  }
}

/* ———————— Reservations ———————— */
router.post('/reservations', optionalProtect, async (req, res, next) => {
  try {
    const { name, email, phone, date, time, guests, notes } = req.body
    if (!name || !email || !phone || !date || !time) throw new ApiError(400, 'Please complete all required fields.')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email.')
    const reservation = await Reservation.create({
      user: req.user?._id,
      name,
      email,
      phone,
      date,
      time,
      guests: String(guests || '2'),
      notes: notes || '',
    })
    // The guest gets a confirmation; the restaurant gets a notification it can reply to.
    sendEmail({ to: email, ...templates.reservation(reservation), template: 'reservation' })
    sendEmail({
      to: RESTAURANT_INBOX,
      replyTo: email,
      ...templates.reservationNotification(reservation),
      template: 'reservationNotification',
    })
    res.status(201).json({ reservation })
  } catch (e) {
    next(e)
  }
})

router.get('/reservations/mine', protect, async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id }).sort({ date: -1, time: -1 })
    res.json({ reservations })
  } catch (e) {
    next(e)
  }
})

/** Customer cancels their own table request (only while it is still pending/confirmed). */
router.patch('/reservations/:id/cancel', protect, async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Reservation not found.')
    if (String(reservation.user) !== String(req.user._id)) throw new ApiError(403, 'That reservation is not yours.')
    if (reservation.status === 'Cancelled') throw new ApiError(409, 'That reservation is already cancelled.')
    if (reservation.status === 'Seated' || reservation.status === 'Completed')
      throw new ApiError(409, 'This visit is already underway — call the restaurant instead.')

    reservation.status = 'Cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancelReason = 'Cancelled by guest'
    await reservation.save()
    await logAudit(req, 'cancel:reservation', 'reservation', `${reservation.date} at ${reservation.time}`, reservation._id)
    res.json({ reservation, message: 'Reservation cancelled.' })
  } catch (e) {
    next(e)
  }
})

/* ———————— Contact ———————— */
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, message } = req.body
    if (!name || !email || !message) throw new ApiError(400, 'All fields are required.')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email.')
    const enquiry = await ContactMessage.create({ name, email, message })

    // 1) to the restaurant inbox (reply goes straight back to the guest)
    // 2) an acknowledgement to the guest, so they know it landed
    await Promise.all([
      sendEmail({
        to: RESTAURANT_INBOX,
        replyTo: email,
        ...templates.enquiryNotification(enquiry),
        template: 'enquiryNotification',
      }),
      sendEmail({ to: email, ...templates.enquiryAck(enquiry), template: 'enquiryAck' }),
    ])

    res.status(201).json({ message: 'Thanks — we’ll be in touch within one business day.' })
  } catch (e) {
    next(e)
  }
})

/* ———————— Restaurant settings (public) ———————— */
router.get('/settings', async (_req, res, next) => {
  try {
    let settings = await Setting.findOne({ key: 'restaurant' })
    if (!settings) settings = await Setting.create({ key: 'restaurant' })
    res.json({ settings })
  } catch (e) {
    next(e)
  }
})

/* ———————— Coupons: preview an order ———————— */
router.post('/coupons/preview', async (req, res, next) => {
  try {
    const { code, items } = req.body
    const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase(), active: true })
    if (!coupon) throw new ApiError(404, 'That promo code isn’t valid.')
    const totals = computeTotals(items || [], coupon)
    res.json({ coupon, totals })
  } catch (e) {
    next(e)
  }
})

export default router

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { User, Address, MenuItem, Notification } from '../models/index.js'
import { protect } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'

const router = Router()
router.use(protect)

/* —— Profile —— */
router.patch('/me', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone } = req.body
    if (email) {
      const clash = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } })
      if (clash) throw new ApiError(409, 'That email is already in use.')
    }
    Object.assign(req.user, {
      ...(firstName != null && { firstName }),
      ...(lastName != null && { lastName }),
      ...(email != null && { email }),
      ...(phone != null && { phone }),
    })
    await req.user.save()
    const obj = req.user.toObject()
    delete obj.passwordHash
    res.json({ user: obj })
  } catch (e) {
    next(e)
  }
})

router.patch('/me/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!newPassword || newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters.')
    if (!(await bcrypt.compare(String(currentPassword || ''), req.user.passwordHash))) {
      throw new ApiError(401, 'Current password is incorrect.')
    }
    req.user.passwordHash = await bcrypt.hash(newPassword, 10)
    await req.user.save()
    res.json({ message: 'Password changed successfully.' })
  } catch (e) {
    next(e)
  }
})

router.patch('/me/preferences', async (req, res, next) => {
  try {
    req.user.preferences = { ...req.user.preferences?.toObject?.(), ...req.body }
    await req.user.save()
    res.json({ preferences: req.user.preferences })
  } catch (e) {
    next(e)
  }
})

/* —— Recently viewed (progress tracking) —— */
router.post('/me/viewed/:menuItemId', async (req, res, next) => {
  try {
    const id = req.params.menuItemId
    if (!Types.ObjectId.isValid(id)) return res.json({ recentlyViewed: [] })
    req.user.recentlyViewed = [id, ...req.user.recentlyViewed.filter((v) => v.toString() !== id)].slice(0, 10)
    await req.user.save()
    res.json({ recentlyViewed: req.user.recentlyViewed })
  } catch (e) {
    next(e)
  }
})

router.get('/me/recently-viewed', async (req, res, next) => {
  try {
    const items = await MenuItem.find({ _id: { $in: req.user.recentlyViewed } })
    const map = new Map(items.map((i) => [i._id.toString(), i]))
    res.json({ items: req.user.recentlyViewed.map((id) => map.get(id.toString())).filter(Boolean) })
  } catch (e) {
    next(e)
  }
})

/* —— Addresses —— */
router.get('/me/addresses', async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 })
    res.json({ addresses })
  } catch (e) {
    next(e)
  }
})

router.post('/me/addresses', async (req, res, next) => {
  try {
    const { label, line, city, postal, phone, isDefault } = req.body
    if (!line || !city || !postal) throw new ApiError(400, 'Street, city and postal code are required.')
    if (isDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })
    const count = await Address.countDocuments({ user: req.user._id })
    const address = await Address.create({
      user: req.user._id,
      label: label || 'Home',
      line,
      city,
      postal,
      phone,
      isDefault: isDefault || count === 0,
    })
    res.status(201).json({ address })
  } catch (e) {
    next(e)
  }
})

router.patch('/me/addresses/:id', async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id })
    if (!address) throw new ApiError(404, 'Address not found.')
    if (req.body.isDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })
    Object.assign(address, req.body)
    await address.save()
    res.json({ address })
  } catch (e) {
    next(e)
  }
})

router.delete('/me/addresses/:id', async (req, res, next) => {
  try {
    await Address.deleteOne({ _id: req.params.id, user: req.user._id })
    res.json({ message: 'Address removed' })
  } catch (e) {
    next(e)
  }
})

/* —— Favorites —— */
router.get('/me/favorites', async (req, res, next) => {
  try {
    const items = await MenuItem.find({ _id: { $in: req.user.favorites } })
    res.json({ items, favoriteIds: req.user.favorites })
  } catch (e) {
    next(e)
  }
})

router.post('/me/favorites/:menuItemId', async (req, res, next) => {
  try {
    const id = req.params.menuItemId
    if (!Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid item.')
    const has = req.user.favorites.some((f) => f.toString() === id)
    if (has) req.user.favorites = req.user.favorites.filter((f) => f.toString() !== id)
    else req.user.favorites.push(id)
    await req.user.save()
    res.json({ favorites: req.user.favorites, added: !has })
  } catch (e) {
    next(e)
  }
})

/* —— Saved payment methods (tokenized mock) —— */
router.get('/me/payment-methods', (req, res) => {
  res.json({ methods: req.user.paymentMethods || [] })
})

router.post('/me/payment-methods', async (req, res, next) => {
  try {
    const { cardNumber, expiry, cvv, holder } = req.body
    const digits = String(cardNumber || '').replace(/\D/g, '')
    if (digits.length < 15) throw new ApiError(400, 'Enter a valid card number.')
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(expiry || '')) throw new ApiError(400, 'Expiry must be MM / YY.')
    if (!holder) throw new ApiError(400, 'Cardholder name is required.')
    const [mm, yy] = expiry.replace(/\s/g, '').split('/')
    const method = {
      brand: digits.startsWith('4') ? 'Visa' : 'Mastercard',
      last4: digits.slice(-4),
      expMonth: mm,
      expYear: yy,
      holder,
      isDefault: (req.user.paymentMethods || []).length === 0,
    }
    req.user.paymentMethods.push(method)
    await req.user.save()
    res.status(201).json({ methods: req.user.paymentMethods })
  } catch (e) {
    next(e)
  }
})

router.delete('/me/payment-methods/:id', async (req, res, next) => {
  try {
    req.user.paymentMethods = (req.user.paymentMethods || []).filter((m) => m._id.toString() !== req.params.id)
    await req.user.save()
    res.json({ methods: req.user.paymentMethods })
  } catch (e) {
    next(e)
  }
})

router.patch('/me/payment-methods/:id/default', async (req, res, next) => {
  try {
    req.user.paymentMethods = (req.user.paymentMethods || []).map((m) => ({
      ...m.toObject(),
      isDefault: m._id.toString() === req.params.id,
    }))
    await req.user.save()
    res.json({ methods: req.user.paymentMethods })
  } catch (e) {
    next(e)
  }
})

export default router

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID, createHash } from 'node:crypto'
import { User } from '../models/index.js'
import { protect, signToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { sendEmail, templates } from '../utils/email.js'

const router = Router()

function publicUser(u) {
  const obj = u.toObject ? u.toObject() : { ...u }
  delete obj.passwordHash
  delete obj.resetToken
  delete obj.resetTokenExpires
  return obj
}

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body
    if (!firstName || !lastName || !email || !password) throw new ApiError(400, 'Please fill in all required fields.')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.')
    if (String(password).length < 8) throw new ApiError(400, 'Password must be at least 8 characters.')
    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) throw new ApiError(409, 'An account with this email already exists.')

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || '',
      passwordHash: await bcrypt.hash(password, 10),
      lastLoginAt: new Date(),
    })
    setAuthCookie(res, signToken(user))
    sendEmail({ to: user.email, ...templates.welcome(user), template: 'welcome' })
    res.status(201).json({ user: publicUser(user) })
  } catch (e) {
    next(e)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, remember } = req.body
    const user = await User.findOne({ email: String(email || '').toLowerCase() })
    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password. Please try again.')
    }
    user.lastLoginAt = new Date()
    await user.save()
    setAuthCookie(res, signToken(user))
    res.json({ user: publicUser(user), remember: Boolean(remember) })
  } catch (e) {
    next(e)
  }
})

router.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ message: 'Logged out' })
})

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user })
})

router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email: String(email || '').toLowerCase() })
    if (user) {
      const token = randomUUID()
      user.resetToken = createHash('sha256').update(token).digest('hex')
      user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000)
      await user.save()
      const url = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`
      sendEmail({ to: user.email, ...templates.passwordReset(user, url), template: 'reset' })
    }
    // Always respond OK to avoid account enumeration
    res.json({ message: 'Check your inbox for password reset instructions.' })
  } catch (e) {
    next(e)
  }
})

router.post('/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password || String(password).length < 8) throw new ApiError(400, 'Invalid token or password.')
    const hashed = createHash('sha256').update(String(token)).digest('hex')
    const user = await User.findOne({ resetToken: hashed, resetTokenExpires: { $gt: new Date() } })
    if (!user) throw new ApiError(400, 'Reset link is invalid or has expired.')
    user.passwordHash = await bcrypt.hash(password, 10)
    user.resetToken = undefined
    user.resetTokenExpires = undefined
    await user.save()
    res.json({ message: 'Password updated. You can now log in.' })
  } catch (e) {
    next(e)
  }
})

export default router

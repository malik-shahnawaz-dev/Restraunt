import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

const SECRET = process.env.JWT_SECRET || 'ember-sage-dev-secret-change-in-production'
const EXPIRES_DAYS = process.env.JWT_EXPIRES_DAYS || '7'

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, SECRET, {
    expiresIn: `${EXPIRES_DAYS}d`,
  })
}

export function setAuthCookie(res, token) {
  res.cookie('es_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * Number(EXPIRES_DAYS),
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie('es_token', { path: '/' })
}

export function extractToken(req) {
  if (req.cookies?.es_token) return req.cookies.es_token
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function loadUserFromToken(req) {
  const token = extractToken(req)
  if (!token) return null
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await User.findById(payload.sub).select('-passwordHash -resetToken')
    return user
  } catch {
    return null
  }
}

export async function protect(req, res, next) {
  const user = await loadUserFromToken(req)
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' })
  }
  req.user = user
  next()
}

export async function optionalProtect(req, _res, next) {
  const user = await loadUserFromToken(req)
  if (user) req.user = user
  next()
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }
  next()
}

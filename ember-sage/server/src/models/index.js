import { randomUUID } from 'node:crypto'
import { Schema, model, Types } from '../db/orm.js'

/* ————————————————— Users ————————————————— */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    joined: { type: Date, default: Date.now },
    favorites: [{ type: Types.ObjectId, ref: 'MenuItem' }],
    recentlyViewed: [{ type: Types.ObjectId, ref: 'MenuItem' }],
    preferences: {
      orderEmails: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      promos: { type: Boolean, default: false },
      dimNight: { type: Boolean, default: false },
    },
    paymentMethods: [
      {
        _id: { type: Types.ObjectId, auto: true },
        brand: { type: String, default: 'Visa' },
        last4: String,
        expMonth: String,
        expYear: String,
        holder: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    resetToken: String,
    resetTokenExpires: Date,
    lastLoginAt: Date,
    avatar: String,
    birthday: String,
    loyalty: {
      points: { type: Number, default: 0 },
      tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
      lifetimeSpend: { type: Number, default: 0 },
      ordersCompleted: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      lastOrderAt: Date,
    },
    notes: String,
    blocked: { type: Boolean, default: false },
  },
  { timestamps: true },
)

/* ————————————————— Addresses ————————————————— */
const addressSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'Home' },
    line: { type: String, required: true },
    city: { type: String, required: true },
    postal: { type: String, required: true },
    phone: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
)

/* ————————————————— Categories ————————————————— */
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

/* ————————————————— Menu items ————————————————— */
const menuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.7, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    prepTime: { type: Number, default: 15 },
    calories: { type: Number, default: 400 },
    image: String,
    description: { type: String, default: '' },
    longDescription: { type: String, default: '' },
    ingredients: [String],
    allergens: [String],
    tags: [String],
    featured: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
)

/* ————————————————— Cart ————————————————— */
const cartItemSchema = new Schema(
  {
    key: String,
    menuItem: { type: Types.ObjectId, ref: 'MenuItem' },
    name: String,
    image: String,
    price: Number,
    qty: { type: Number, min: 1 },
    size: { type: String, default: 'regular' },
    addons: [{ id: String, label: String, price: Number }],
    notes: { type: String, default: '' },
  },
  { _id: false },
)

/* NOTE: a nested plain-object with a `type` key would make Mongoose treat the
   whole path as a single String field (classic `type` gotcha), so the applied
   coupon is an explicit subdocument schema where `type` uses the double-`type` form. */
const appliedCouponSchema = new Schema(
  {
    code: String,
    type: { type: String },
    value: Number,
    min: Number,
    label: String,
  },
  { _id: false },
)

const cartSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    coupon: appliedCouponSchema,
  },
  { timestamps: true },
)

/* ————————————————— Orders ————————————————— */
const orderItemSchema = new Schema(
  {
    menuItem: { type: Types.ObjectId, ref: 'MenuItem' },
    name: String,
    image: String,
    qty: Number,
    unitPrice: Number,
    size: String,
    addons: [{ id: String, label: String, price: Number }],
    notes: String,
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    orderNumber: { type: Number, required: true, unique: true },
    user: { type: Types.ObjectId, ref: 'User', index: true },
    items: [orderItemSchema],
    subtotal: Number,
    tax: Number,
    deliveryFee: Number,
    discount: { type: Number, default: 0 },
    couponCode: String,
    total: Number,
    paymentMethod: { type: String, enum: ['card', 'online', 'cod'], default: 'card' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    fulfillment: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
    deliveryAddress: {
      line: String,
      apartment: String,
      city: String,
      postal: String,
      instructions: String,
    },
    pickupTime: String,
    customerNotes: String,
    contact: { name: String, email: String, phone: String },
    etaMinutes: { type: Number, default: 40 },
    cancelReason: String,
    rated: { type: Boolean, default: false },
    timeline: [
      { status: String, at: { type: Date, default: Date.now }, note: String },
    ],
  },
  { timestamps: true },
)

/* ————————————————— Payments ————————————————— */
const paymentSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: 'Order', index: true },
    user: { type: Types.ObjectId, ref: 'User' },
    transactionId: { type: String, default: () => `txn_${randomUUID().slice(0, 8)}` },
    method: { type: String, enum: ['card', 'online', 'cod'] },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'] },
    amount: Number,
    cardLast4: String,
  },
  { timestamps: true },
)

/* ————————————————— Reservations ————————————————— */
const reservationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: String, default: '2' },
    notes: String,
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    cancelReason: String,
    cancelledAt: Date,
    tableId: String,
  },
  { timestamps: true },
)

/* ————————————————— Reviews ————————————————— */
const reviewSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User' },
    menuItem: { type: Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    initials: String,
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, required: true },
    dish: String,
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    featured: { type: Boolean, default: false },
    order: { type: Types.ObjectId, ref: 'Order' },
    reply: String,
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

/* ————————————————— Coupons ————————————————— */
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'delivery', 'fixed'], required: true },
    value: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    usageLimit: { type: Number, default: 1000 },
    used: { type: Number, default: 0 },
    label: String,
  },
  { timestamps: true },
)

/* ————————————————— Notifications ————————————————— */
const notificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['order', 'payment', 'reservation', 'promo', 'system'], default: 'system' },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
)

/* ————————————————— Counters / settings / misc ————————————————— */
const counterSchema = new Schema({ key: { type: String, unique: true }, seq: { type: Number, default: 10256 } })

const settingSchema = new Schema(
  {
    key: { type: String, default: 'restaurant', unique: true },
    name: String,
    tagline: String,
    phone: String,
    email: String,
    address: String,
    hours: [{ days: String, time: String }],
    openToday: String,
    acceptOrders: { type: Boolean, default: true },
    autoConfirm: { type: Boolean, default: true },
    codEnabled: { type: Boolean, default: true },
    maintenance: { type: Boolean, default: false },
    freeDeliveryThreshold: { type: Number, default: 50 },
    deliveryFee: { type: Number, default: 3.5 },
    taxRate: { type: Number, default: 0.1 },
  },
  { timestamps: true },
)

/* ————————————————— CMS: editable content blocks —————————————————
   Every marketing surface (home hero, about story, footer note, announcements…)
   is stored as a keyed block so the admin CMS edits live database content
   instead of hard-coded copy in the React bundle. */
const contentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    group: { type: String, default: 'home', index: true },
    title: String,
    subtitle: String,
    eyebrow: String,
    body: String,
    image: String,
    ctaLabel: String,
    ctaHref: String,
    data: { type: Object, default: {} },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    updatedBy: String,
  },
  { timestamps: true },
)

/* ————————————————— CMS: gallery ————————————————— */
const gallerySchema = new Schema(
  {
    title: { type: String, required: true },
    caption: String,
    image: { type: String, required: true },
    category: { type: String, default: 'Interior' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

/* ————————————————— CMS: FAQs ————————————————— */
const faqSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, default: 'General' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

/* ————————————————— Newsletter subscribers ————————————————— */
const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: 'footer' },
    active: { type: Boolean, default: true },
    unsubscribedAt: Date,
  },
  { timestamps: true },
)

/* ————————————————— Media library (uploads) ————————————————— */
const mediaAssetSchema = new Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    originalName: String,
    mimetype: String,
    size: { type: Number, default: 0 },
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

/* ————————————————— Audit trail for admin actions ————————————————— */
const auditLogSchema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: 'User' },
    actorName: String,
    action: { type: String, default: 'update' },
    entity: { type: String, default: 'system' },
    entityId: String,
    summary: String,
  },
  { timestamps: true },
)

const contactSchema = new Schema(
  { name: String, email: String, message: String, status: { type: String, default: 'new' }, handledBy: String },
  { timestamps: true },
)
const emailLogSchema = new Schema(
  {
    to: String,
    subject: String,
    template: String,
    preview: String,
    status: { type: String, default: 'dev-outbox' }, // sent | dev-outbox | failed
    error: String,
    providerId: String,
  },
  { timestamps: true },
)
const failedJobSchema = new Schema({ error: String, context: Object }, { timestamps: true })

export const User = model('User', userSchema)
export const Address = model('Address', addressSchema)
export const Category = model('Category', categorySchema)
export const MenuItem = model('MenuItem', menuItemSchema)
export const Cart = model('Cart', cartSchema)
export const Order = model('Order', orderSchema)
export const Payment = model('Payment', paymentSchema)
export const Reservation = model('Reservation', reservationSchema)
export const Review = model('Review', reviewSchema)
export const Coupon = model('Coupon', couponSchema)
export const Notification = model('Notification', notificationSchema)
export const Counter = model('Counter', counterSchema)
export const Setting = model('Setting', settingSchema)
export const ContactMessage = model('ContactMessage', contactSchema)
export const EmailLog = model('EmailLog', emailLogSchema)
export const Content = model('Content', contentSchema)
export const GalleryImage = model('GalleryImage', gallerySchema)
export const Faq = model('Faq', faqSchema)
export const Subscriber = model('Subscriber', subscriberSchema)
export const MediaAsset = model('MediaAsset', mediaAssetSchema)
export const AuditLog = model('AuditLog', auditLogSchema)

/* ————————————————— Helpers ————————————————— */

/** Append a step to an order's public tracking timeline. */
export function pushTimeline(order, status, note = '') {
  const entry = { status, at: new Date(), note }
  const timeline = Array.isArray(order.timeline) ? [...order.timeline] : []
  if (timeline[timeline.length - 1]?.status !== status) timeline.push(entry)
  order.timeline = timeline
  return order
}

/** Loyalty tiers — points are awarded on delivery (1 point per $1 spent). */
export const LOYALTY_TIERS = [
  { name: 'Bronze', min: 0, perk: 'Member pricing on seasonal specials' },
  { name: 'Silver', min: 250, perk: 'Free dessert on your birthday' },
  { name: 'Gold', min: 750, perk: 'Priority kitchen queue + free delivery' },
  { name: 'Platinum', min: 2000, perk: 'Chef’s table invitations & 5% cashback' },
]

export function tierFor(points = 0) {
  return [...LOYALTY_TIERS].reverse().find((t) => points >= t.min)?.name || 'Bronze'
}

export async function nextOrderNumber() {
  const doc = await Counter.findOneAndUpdate(
    { key: 'orderNumber' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return doc.seq
}

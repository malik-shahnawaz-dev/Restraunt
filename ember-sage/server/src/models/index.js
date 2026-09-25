import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'

const { Schema, model, Types } = mongoose

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
    status: { type: String, enum: ['Pending', 'Confirmed', 'Seated', 'Cancelled'], default: 'Pending' },
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

const contactSchema = new Schema({ name: String, email: String, message: String }, { timestamps: true })
const emailLogSchema = new Schema(
  { to: String, subject: String, template: String, preview: String },
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

export async function nextOrderNumber() {
  const doc = await Counter.findOneAndUpdate(
    { key: 'orderNumber' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return doc.seq
}

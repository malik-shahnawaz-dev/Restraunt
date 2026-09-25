import { EmailLog } from '../models/index.js'

/**
 * Transactional email service.
 *
 * - With SMTP_HOST **and** SMTP_PASS configured, mail is delivered for real
 *   through Nodemailer (Gmail, Mailgun, Brevo, SES, any SMTP server).
 * - Otherwise every message is written to the EmailLog collection and printed
 *   to the console ("dev outbox"), so the whole product stays usable and
 *   testable before credentials exist.
 *
 * Both paths always log, so the admin can see what was sent from the API.
 */
const INBOX = process.env.MAIL_TO || process.env.SMTP_USER || 'shahnawazsocials@gmail.com'

/**
 * Envelope sender. Gmail (and most providers) will reject or silently rewrite a
 * From address that is not yours, so with SMTP configured we default to the
 * authenticated address unless MAIL_FROM is set explicitly.
 */
function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM
  if (process.env.SMTP_USER) return `Ember & Sage <${process.env.SMTP_USER}>`
  return 'Ember & Sage <orders@emberandsage.pk>'
}

let transporter = null
let transportPromise = null

/** True when real delivery is possible; false means "dev outbox". */
export function smtpConfigured() {
  const { SMTP_HOST, SMTP_PASS } = process.env
  return Boolean(SMTP_HOST && SMTP_PASS)
}

async function getTransport() {
  if (!smtpConfigured()) return null
  if (transporter) return transporter
  if (transportPromise) return transportPromise

  transportPromise = (async () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
    const port = Number(SMTP_PORT || 587)
    const nodemailer = await import('nodemailer')
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      // 465 is implicit TLS; everything else upgrades with STARTTLS when offered.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 2,
      maxMessages: 20,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
    transporter = transport
    return transport
  })()

  return transportPromise
}

/**
 * Verify the SMTP credentials at boot. Never throws — a bad password must not
 * stop the API, it just falls back to the dev outbox with a loud warning.
 */
export async function verifyTransport() {
  if (!smtpConfigured()) {
    console.log('[email] SMTP not configured — using the dev outbox (EmailLog + console)')
    return false
  }
  try {
    const transport = await getTransport()
    await transport.verify()
    console.log(`[email] SMTP ready → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER}`)
    return true
  } catch (err) {
    transporter = null
    transportPromise = null
    console.warn(`[email] SMTP verification failed (${err.message}) — falling back to the dev outbox`)
    return false
  }
}

const shell = (title, lines, footer = '') => `
<div style="font-family:Georgia,serif;background:#FBF7F0;padding:32px;color:#17140F">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E7DCC9">
    <div style="background:#17140F;padding:22px 28px">
      <span style="color:#FBF7F0;font-size:18px;letter-spacing:0.04em">Ember <span style="color:#C0522F">&amp;</span> Sage</span>
    </div>
    <div style="padding:28px">
      <h1 style="font-size:22px;margin:0 0 6px;color:#17140F">${title}</h1>
      ${lines.map((l) => `<p style="font-size:14.5px;line-height:1.6;color:#453E33;margin:8px 0">${l}</p>`).join('')}
      ${footer ? `<p style="font-size:12.5px;color:#8C8375;margin-top:22px;border-top:1px solid #F2EADB;padding-top:14px">${footer}</p>` : ''}
    </div>
  </div>
</div>`

export const templates = {
  welcome: (u) => ({
    subject: 'Welcome to Ember & Sage',
    html: shell(
      `Welcome, ${u.firstName}!`,
      [
        'Your account is ready. Order your favorites, track deliveries and save addresses for faster checkout.',
        'Every order earns loyalty points you can watch grow in your account.',
      ],
      '© 2026 Ember & Sage · Islamabad',
    ),
  }),

  orderConfirmed: (order) => ({
    subject: `Order #${order.orderNumber} confirmed — Ember & Sage`,
    html: shell(
      'Order Confirmed',
      [
        `Thank you, ${order.contact?.name || 'friend'}! We've received your order <strong>#${order.orderNumber}</strong> and the kitchen is on it.`,
        ...order.items.map(
          (i) =>
            `${i.qty} × ${i.name}${i.addons?.length ? ` (${i.addons.map((a) => a.name).join(', ')})` : ''} — $${((i.unitPrice + (i.addons || []).reduce((s, a) => s + a.price, 0)) * i.qty).toFixed(2)}`,
        ),
        `<strong>Subtotal</strong> $${order.subtotal.toFixed(2)} · <strong>Tax</strong> $${order.tax.toFixed(2)} · <strong>Delivery</strong> ${order.deliveryFee ? '$' + order.deliveryFee.toFixed(2) : 'Free'}${order.discount ? ` · <strong>Discount</strong> −$${order.discount.toFixed(2)}` : ''}`,
        `<strong>Total: $${order.total.toFixed(2)}</strong> · Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`,
        order.fulfillment === 'pickup'
          ? `Pickup at ${order.pickupAddress || '12 Hillview Road, F-7 Markaz'} — ${order.pickupTime || 'ASAP'}`
          : `Delivering to ${order.deliveryAddress?.line}, ${order.deliveryAddress?.city} — ETA ${order.etaMinutes} min`,
      ],
      'Track your order any time from your account — we will email you at every step.',
    ),
  }),

  orderStatus: (order) => ({
    subject: `Order #${order.orderNumber} — ${order.orderStatus}`,
    html: shell(
      `Your order is ${order.orderStatus}`,
      [
        `Order <strong>#${order.orderNumber}</strong> status update: <strong>${order.orderStatus}</strong>.`,
        `Estimated: ${order.etaMinutes} minutes.`,
      ],
      'Thank you for ordering with Ember & Sage.',
    ),
  }),

  orderDelivered: (order) => ({
    subject: `Order #${order.orderNumber} delivered`,
    html: shell(
      'Delivered — enjoy!',
      [`Order <strong>#${order.orderNumber}</strong> has been delivered. We hope everything tasted perfect.`],
      'Rate your order in your account — it helps the kitchen and other guests.',
    ),
  }),

  orderCancelled: (order) => ({
    subject: `Order #${order.orderNumber} cancelled`,
    html: shell(
      'Order cancelled',
      [
        `Order <strong>#${order.orderNumber}</strong> has been cancelled${order.cancelReason ? ` — ${order.cancelReason}` : ''}.`,
        order.paymentStatus === 'paid' ? 'Any captured payment is being refunded and should appear within 5–10 working days.' : 'No payment was captured.',
      ],
      'Questions? Just reply to this email.',
    ),
  }),

  passwordReset: (u, url) => ({
    subject: 'Reset your password',
    html: shell(
      'Password reset',
      [
        `Hi ${u.firstName}, use this link within 30 minutes to choose a new password:`,
        `<a href="${url}" style="color:#C0522F">${url}</a>`,
      ],
      'If you did not request this, you can safely ignore this email.',
    ),
  }),

  reservation: (r) => ({
    subject: 'Reservation requested — Ember & Sage',
    html: shell(
      'Reservation received',
      [
        `Thanks ${r.name} — we have your request for <strong>${r.guests} guests</strong> on <strong>${r.date}</strong> at <strong>${r.time}</strong>.`,
        'Our team confirms every booking (usually within 30 minutes during opening hours).',
        r.notes ? `Your note: “${r.notes}”` : '',
      ].filter(Boolean),
      'Ember & Sage · +92 51 234 5678 · 12 Hillview Road, F-7 Markaz, Islamabad',
    ),
  }),

  /** Sent to the customer straight after they use the contact form. */
  enquiryAck: (m) => ({
    subject: 'We got your message — Ember & Sage',
    html: shell(
      'Thanks for reaching out',
      [
        `Hi ${m.name}, thanks for getting in touch — we have your message and will reply within one business day.`,
        `<em style="color:#8C8375">“${String(m.message).slice(0, 300)}”</em>`,
      ],
      'Ember & Sage · +92 51 234 5678',
    ),
  }),

  /** Sent to the restaurant inbox so queries never sit unseen. */
  enquiryNotification: (m) => ({
    subject: `New enquiry from ${m.name} (${m.email})`,
    html: shell(
      'New contact-form enquiry',
      [
        `<strong>Name:</strong> ${m.name}`,
        `<strong>Email:</strong> <a href="mailto:${m.email}" style="color:#C0522F">${m.email}</a>`,
        `<strong>Received:</strong> ${new Date().toLocaleString()}`,
        `<strong>Message:</strong><br>${String(m.message).replace(/\n/g, '<br>')}`,
      ],
      'Reply directly to this email to answer them — it goes straight to the guest.',
    ),
  }),

  reservationNotification: (r) => ({
    subject: `New table request — ${r.name}, ${r.guests} guests · ${r.date} ${r.time}`,
    html: shell(
      'New reservation request',
      [
        `<strong>Name:</strong> ${r.name}`,
        `<strong>Phone:</strong> ${r.phone}`,
        `<strong>Email:</strong> ${r.email}`,
        `<strong>When:</strong> ${r.date} at ${r.time}`,
        `<strong>Guests:</strong> ${r.guests}`,
        r.notes ? `<strong>Notes:</strong> ${r.notes}` : '',
      ].filter(Boolean),
      'Confirm it from Admin → Reservations.',
    ),
  }),
}

/**
 * Send one email.
 * @returns {Promise<{ok: boolean, delivered: boolean, error?: string, id?: string}>}
 */
export async function sendEmail({ to, subject, html, template = 'generic', replyTo, bcc }) {
  const preview = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  const recipients = [to, ...(bcc ? [bcc] : [])].filter(Boolean).join(', ')

  try {
    const transport = await getTransport()
    if (transport) {
      const info = await transport.sendMail({
        from: fromAddress(),
        to,
        ...(bcc ? { bcc } : {}),
        ...(replyTo ? { replyTo } : {}),
        subject,
        html,
      })
      await EmailLog.create({ to: recipients, subject, template, preview, status: 'sent', providerId: info?.messageId })
      console.log(`[email] sent → ${recipients} | ${subject}`)
      return { ok: true, delivered: true, id: info?.messageId }
    }

    // Dev outbox: nothing is lost, it is simply not handed to an SMTP server.
    await EmailLog.create({ to: recipients, subject, template, preview, status: 'dev-outbox' })
    console.log(`[email:dev] → ${recipients} | ${subject}`)
    return { ok: true, delivered: false }
  } catch (err) {
    await EmailLog.create({ to: recipients, subject, template, preview, status: 'failed', error: err.message }).catch(
      () => {},
    )
    console.error(`[email] failed → ${recipients} | ${subject} | ${err.message}`)
    return { ok: false, delivered: false, error: err.message }
  }
}

/** Address enquiries, table requests and admin notices land in. */
export const RESTAURANT_INBOX = INBOX
export const DEFAULT_FROM = fromAddress()

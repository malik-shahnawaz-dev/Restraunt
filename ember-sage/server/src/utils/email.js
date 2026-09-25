import { EmailLog } from '../models/index.js'

/**
 * Transactional email service.
 * - If SMTP_* env vars are configured, emails are sent via Nodemailer.
 * - Otherwise every email is persisted to the EmailLog collection and printed
 *   to the server console (dev outbox), so the full flow stays testable.
 */

let transporter = null

async function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST) return null
  if (!transporter) {
    const nodemailer = await import('nodemailer')
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  }
  return transporter
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
      ['Your account is ready. Order your favorites, track deliveries and save addresses for faster checkout.'],
      '© 2026 Ember & Sage · Islamabad',
    ),
  }),
  orderConfirmed: (order) => ({
    subject: `Order #${order.orderNumber} confirmed`,
    html: shell(
      'Order Confirmed',
      [
        `Thank you, ${order.contact?.name || 'friend'}! We've received your order <strong>#${order.orderNumber}</strong>.`,
        ...order.items.map((i) => `${i.qty} × ${i.name} — $${((i.unitPrice + (i.addons || []).reduce((s, a) => s + a.price, 0)) * i.qty).toFixed(2)}`),
        `<strong>Subtotal</strong> $${order.subtotal.toFixed(2)} · <strong>Tax</strong> $${order.tax.toFixed(2)} · <strong>Delivery</strong> ${order.deliveryFee ? '$' + order.deliveryFee.toFixed(2) : 'Free'}${order.discount ? ` · <strong>Discount</strong> −$${order.discount.toFixed(2)}` : ''}`,
        `<strong>Total: $${order.total.toFixed(2)}</strong> · Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`,
        order.fulfillment === 'pickup'
          ? `Pickup at 12 Hillview Road, F-7 Markaz — ${order.pickupTime || 'ASAP'}`
          : `Delivering to ${order.deliveryAddress?.line}, ${order.deliveryAddress?.city} — ETA ${order.etaMinutes} min`,
      ],
      'Track your order any time from your account.',
    ),
  }),
  orderStatus: (order) => ({
    subject: `Order #${order.orderNumber} — ${order.orderStatus}`,
    html: shell(
      `Your order is ${order.orderStatus}`,
      [`Order <strong>#${order.orderNumber}</strong> status update: <strong>${order.orderStatus}</strong>.`, `Estimated: ${order.etaMinutes} minutes.`],
      'Thank you for ordering with Ember & Sage.',
    ),
  }),
  orderDelivered: (order) => ({
    subject: `Order #${order.orderNumber} delivered`,
    html: shell('Delivered — enjoy!', [`Order <strong>#${order.orderNumber}</strong> has been delivered. We hope everything tasted perfect.`], 'Rate your order in your account.'),
  }),
  passwordReset: (u, url) => ({
    subject: 'Reset your password',
    html: shell('Password reset', [`Hi ${u.firstName}, use this link within 30 minutes to reset your password:<br><a href="${url}" style="color:#C0522F">${url}</a>`], 'If you did not request this, ignore this email.'),
  }),
  reservation: (r) => ({
    subject: 'Reservation requested',
    html: shell('Reservation received', [`Thanks ${r.name} — request for ${r.guests} guests on ${r.date} at ${r.time} received. We will confirm shortly.`], 'Ember & Sage · +92 51 234 5678'),
  }),
}

export async function sendEmail({ to, subject, html, template = 'generic' }) {
  try {
    const logPromise = EmailLog.create({ to, subject, template, preview: String(html).replace(/<[^>]+>/g, ' ').slice(0, 240) })
    const transport = await getTransport()
    if (transport) {
      await transport.sendMail({ from: process.env.MAIL_FROM || 'Ember & Sage <orders@emberandsage.pk>', to, subject, html })
    } else {
      console.log(`[email:dev] → ${to} | ${subject}`)
    }
    await logPromise
    return true
  } catch (err) {
    console.error('[email] failed:', err.message)
    return false
  }
}

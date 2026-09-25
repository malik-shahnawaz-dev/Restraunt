/**
 * mail-test.mjs — prove the email pipeline really delivers.
 *
 * Two modes:
 *
 *   npm run mail:test            spins up a throwaway SMTP server on :2525 and
 *                                sends every template through it, printing what
 *                                arrived. Works offline, needs no credentials.
 *
 *   npm run mail:test -- --live  uses the SMTP_* settings from .env and sends a
 *                                real email to --to you@example.com
 *
 * Either way the exit code is non-zero if a message failed to send.
 */
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const args = process.argv.slice(2)
const live = args.includes('--live')
const toIndex = args.indexOf('--to')
const RECIPIENT = toIndex > -1 ? args[toIndex + 1] : process.env.TEST_MAIL_TO || 'shahnawazsocials@gmail.com'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ── 1. throwaway SMTP sink (dev mode only) ──────────────────────────────── */
const received = []

function startSink(port = 2525) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      let buffer = ''
      let inData = false
      let envelope = { from: '', to: [] }
      const reply = (code, text) => socket.write(`${code} ${text}\r\n`)

      socket.on('error', () => {})
      reply(220, 'mail-test ESMTP')

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
        let index
        while ((index = buffer.indexOf('\r\n')) > -1) {
          const line = buffer.slice(0, index)
          buffer = buffer.slice(index + 2)

          if (inData) {
            if (line === '.') {
              inData = false
              received.push({ ...envelope, body: (envelope.body || '') })
              envelope = { from: '', to: [] }
              reply(250, 'OK queued as mailtest')
              continue
            }
            envelope.body = (envelope.body || '') + line + '\n'
            continue
          }

          const upper = line.toUpperCase()
          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            reply(250, 'mail-test greets you')
          } else if (upper.startsWith('AUTH LOGIN')) {
            reply(334, 'VXNlcm5hbWU6')
          } else if (upper.startsWith('AUTH PLAIN')) {
            reply(235, '2.7.0 Authentication successful')
          } else if (/^[A-Z0-9+/=]+$/.test(line) && line.length > 8 && /^[A-Za-z0-9+/]+={0,2}$/.test(line)) {
            // base64 blob exchanged during AUTH LOGIN
            reply(334, line.length % 4 === 0 ? 'UGFzc3dvcmQ6' : '235 2.7.0 Authentication successful')
          } else if (upper.startsWith('MAIL FROM')) {
            envelope.from = (line.match(/<([^>]*)>/) || [, line.slice(10)])[1]
            reply(250, 'OK')
          } else if (upper.startsWith('RCPT TO')) {
            envelope.to.push((line.match(/<([^>]*)>/) || [, line.slice(8)])[1])
            reply(250, 'OK')
          } else if (upper === 'DATA') {
            inData = true
            reply(354, 'End data with <CR><LF>.<CR><LF>')
          } else if (upper === 'QUIT') {
            reply(221, 'Bye')
            socket.end()
          } else if (upper === 'RSET' || upper === 'NOOP') {
            reply(250, 'OK')
          } else {
            reply(250, 'OK')
          }
        }
      })
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

/* ── 2. run ──────────────────────────────────────────────────────────────── */
let sink
if (!live) {
  sink = await startSink(2525)
  process.env.SMTP_HOST = '127.0.0.1'
  process.env.SMTP_PORT = '2525'
  process.env.SMTP_USER = 'mailtest'
  process.env.SMTP_PASS = 'mailtest'
  process.env.SMTP_SECURE = 'false'
  process.env.NODE_ENV = 'test'
}

const { connectDB } = await import(path.join(root, 'server/src/config/db.js'))
const { disconnect } = await import(path.join(root, 'server/src/db/orm.js'))
const { sendEmail, templates, smtpConfigured, verifyTransport } = await import(
  path.join(root, 'server/src/utils/email.js')
)

process.chdir(root)
await connectDB()

console.log(`\nMode: ${live ? 'LIVE SMTP from .env' : 'local SMTP sink on 127.0.0.1:2525'}`)
console.log(`Configured: ${smtpConfigured() ? 'yes' : 'NO — messages will land in the dev outbox'}`)
if (live) {
  const ok = await verifyTransport()
  if (!ok) {
    console.error('\n✗ SMTP credentials were rejected. Check SMTP_HOST/PORT/USER/PASS in .env.')
    await disconnect()
    sink?.close()
    process.exit(1)
  }
}

const demoOrder = {
  orderNumber: 'TEST-1001',
  contact: { name: 'Ayesha Khan', email: RECIPIENT },
  items: [{ qty: 2, name: 'Truffle Pasta', unitPrice: 24, addons: [{ name: 'Parmesan', price: 2 }] }],
  subtotal: 52,
  tax: 5.2,
  deliveryFee: 0,
  discount: 5,
  total: 52.2,
  paymentMethod: 'card',
  paymentStatus: 'paid',
  fulfillment: 'delivery',
  deliveryAddress: { line: 'House 4, Street 12, F-7/2', city: 'Islamabad' },
  etaMinutes: 40,
}

const demo = { firstName: 'Ayesha', lastName: 'Khan', email: RECIPIENT }
const enquiry = { name: 'Bilal Ahmed', email: 'bilal@example.com', message: 'Do you cater for 40 people?' }
const reservation = { name: 'Bilal Ahmed', email: RECIPIENT, phone: '+92 300 1112233', date: '2026-10-02', time: '7:30 PM', guests: '4', notes: 'Window table please' }

const jobs = [
  ['welcome', { to: RECIPIENT, ...templates.welcome(demo), template: 'welcome' }],
  ['orderConfirmed', { to: RECIPIENT, ...templates.orderConfirmed(demoOrder), template: 'orderConfirmed' }],
  ['orderStatus', { to: RECIPIENT, ...templates.orderStatus({ ...demoOrder, orderStatus: 'Preparing' }), template: 'orderStatus' }],
  ['orderDelivered', { to: RECIPIENT, ...templates.orderDelivered(demoOrder), template: 'orderDelivered' }],
  ['orderCancelled', { to: RECIPIENT, ...templates.orderCancelled({ ...demoOrder, cancelReason: 'Changed plans' }), template: 'orderCancelled' }],
  ['enquiryNotification', { to: RECIPIENT, replyTo: enquiry.email, ...templates.enquiryNotification(enquiry), template: 'enquiryNotification' }],
  ['enquiryAck', { to: enquiry.email, ...templates.enquiryAck(enquiry), template: 'enquiryAck' }],
  ['reservationNotification', { to: RECIPIENT, replyTo: reservation.email, ...templates.reservationNotification(reservation), template: 'reservationNotification' }],
  ['reservation', { to: RECIPIENT, ...templates.reservation(reservation), template: 'reservation' }],
  ['passwordReset', { to: RECIPIENT, ...templates.passwordReset(demo, 'http://localhost:5173/reset-password?token=demo'), template: 'passwordReset' }],
]

let failures = 0
for (const [name, message] of jobs) {
  const result = await sendEmail(message)
  const status = result.delivered ? 'delivered via SMTP' : result.ok ? 'dev outbox (no SMTP)' : 'FAILED'
  if (!result.ok) failures += 1
  console.log(`  ${result.ok ? '✓' : '✗'} ${name.padEnd(24)} ${status}${result.error ? ` — ${result.error}` : ''}`)
}

if (!live) {
  await new Promise((r) => setTimeout(r, 400))
  console.log(`\nSMTP sink received ${received.length}/${jobs.length} message(s):`)
  for (const mail of received) {
    const subject = (mail.body.match(/^Subject: (.*)$/m) || [, '(no subject)'])[1]
    const to = (mail.body.match(/^To: (.*)$/m) || [, mail.to.join(', ')] )[1]
    console.log(`  • from ${mail.from} → ${to} | ${subject}`)
  }
  if (received.length < jobs.length) {
    failures += 1
    console.error('  ✗ not every message reached the SMTP server')
  }
} else {
  console.log(`\nSent for real to ${RECIPIENT} — check the inbox (and spam folder).`)
}

await disconnect()
sink?.close()
console.log(failures ? `\n✗ ${failures} failure(s)` : '\n✓ email pipeline healthy')
process.exit(failures ? 1 : 0)

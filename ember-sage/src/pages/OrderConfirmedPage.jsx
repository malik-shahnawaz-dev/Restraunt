import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, Clock3, CreditCard, Mail, MapPin, Package, Truck } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Reveal } from '../components/ui/Motion.jsx'
import { restaurant } from '../data/menu.js'
import { useToast } from '../context/ToastContext.jsx'

const FALLBACK = {
  number: '10257',
  date: 'Sep 24, 2026, 8:14 PM',
  eta: '35 – 45 minutes',
  payment: 'Card ending 4242',
  total: 54.6,
  method: 'delivery',
  address: 'House 42, Street 18, F-8/2, Islamabad 44000',
  email: 'you@email.com',
  name: 'Guest',
  items: [],
}

export default function OrderConfirmedPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    let o = location.state?.order
    if (!o) {
      try {
        o = JSON.parse(sessionStorage.getItem('es_last_order'))
      } catch {
        /* ignore */
      }
    }
    setOrder(o || FALLBACK)
    window.scrollTo(0, 0)
  }, [location.state])

  if (!order) return null

  const isPickup = order.method === 'pickup'

  return (
    <main className="relative overflow-hidden pt-28 pb-20 lg:pt-32">
      {/* soft background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(700px 260px at 50% -60px, rgba(74,124,72,0.10), transparent), radial-gradient(500px 200px at 85% 100%, rgba(192,82,47,0.07), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-2xl px-5">
        {/* Success animation */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
            className="relative grid h-24 w-24 place-items-center rounded-full bg-success-soft"
          >
            <span
              className="absolute inset-0 rounded-full border-2 border-success/40"
              style={{ animation: 'pulse-ring 1.8s ease-out 0.6s 2' }}
              aria-hidden
            />
            <svg viewBox="0 0 52 52" className="h-12 w-12" aria-hidden>
              <circle cx="26" cy="26" r="24" fill="none" stroke="#4A7C48" strokeWidth="2.5" opacity="0.35" />
              <motion.path
                d="M14 27l8 8 16-17"
                fill="none"
                stroke="#4A7C48"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>
            <p className="mt-7 text-[11.5px] font-semibold tracking-[0.24em] text-success uppercase">Success</p>
            <h1 className="mt-2.5 font-display text-[clamp(2.2rem,5vw,3.2rem)] leading-tight font-medium tracking-[-0.02em]">
              Order Confirmed!
            </h1>
            <p className="mx-auto mt-3.5 max-w-md text-[15.5px] leading-relaxed text-warm">
              Thank you for your order, {order.name?.split(' ')[0] || 'friend'}. We&apos;ve received it and are
              preparing your food.
            </p>
          </motion.div>
        </div>

        {/* Receipt card */}
        <Reveal delay={0.85}>
          <div className="mt-9 overflow-hidden rounded-panel border border-ink/8 bg-white shadow-lift">
            <div className="border-b border-dashed border-ink/12 bg-beige/50 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-warm uppercase">Order Number</p>
                  <p className="font-display text-2xl font-medium text-ink">#{order.number}</p>
                </div>
                <span className="rounded-full bg-success-soft px-4 py-2 text-[12.5px] font-bold tracking-wide text-success uppercase">
                  Confirmed
                </span>
              </div>
            </div>

            <dl className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
              {[
                { icon: CalendarDays, label: 'Order Date', value: order.date },
                { icon: Clock3, label: isPickup ? 'Estimated Pickup' : 'Estimated Delivery', value: order.eta },
                { icon: CreditCard, label: 'Payment Method', value: order.payment },
                { icon: isPickup ? MapPin : Truck, label: isPickup ? 'Pickup At' : 'Delivering To', value: order.address },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-soft text-clay">
                    <row.icon size={16} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-warm uppercase">{row.label}</dt>
                    <dd className="mt-0.5 text-[14.5px] font-medium break-words text-ink">{row.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="flex items-center justify-between border-t border-ink/8 bg-ink px-6 py-5 text-cream sm:px-8">
              <span className="text-[13.5px] text-cream/60">Total Amount</span>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="font-display text-3xl font-medium"
              >
                ${Number(order.total).toFixed(2)}
              </motion.span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-[14px] text-warm">
            <Mail size={15} className="text-clay" />
            We&apos;ve sent your order confirmation to <strong className="font-semibold text-ink">{order.email}</strong>
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate(`/track/${order.number}`)}>
              <Package size={16} /> Track My Order
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/menu')}>
              Continue Shopping
            </Button>
          </div>

          <p className="mt-8 text-center text-[13.5px] text-warm">
            Questions about your order?{' '}
            <Link to="/contact" className="font-medium text-clay hover:underline">
              Contact {restaurant.name}
            </Link>
          </p>
        </Reveal>
      </div>
    </main>
  )
}

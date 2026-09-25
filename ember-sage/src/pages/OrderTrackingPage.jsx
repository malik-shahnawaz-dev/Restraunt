import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Clock3, MapPin, Phone, Printer, Store, Truck, UtensilsCrossed, PackageSearch } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { EmptyState, Reveal, Spinner } from '../components/ui/Motion.jsx'
import { restaurant } from '../data/menu.js'
import { useData } from '../context/MenuContext.jsx'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const STAGES = [
  { id: 'placed', label: 'Order Placed', icon: Check, desc: 'We received your order' },
  { id: 'confirmed', label: 'Order Confirmed', icon: Check, desc: 'Payment verified & accepted' },
  { id: 'preparing', label: 'Preparing', icon: UtensilsCrossed, desc: 'Chefs are on the line' },
  { id: 'delivery', label: 'Out for Delivery', icon: Truck, desc: 'Rider heading your way' },
  { id: 'delivered', label: 'Delivered', icon: Store, desc: 'Enjoy your meal' },
]

function Timeline({ activeIndex, cancelled }) {
  if (cancelled) {
    return (
      <div className="rounded-2xl bg-danger-soft p-6 text-center">
        <p className="font-display text-xl font-medium text-danger">This order was cancelled</p>
        <p className="mt-1.5 text-[14px] text-danger/80">Any payment has been refunded to the original method.</p>
      </div>
    )
  }
  return (
    <ol className="relative space-y-0" aria-label="Order status timeline">
      {STAGES.map((stage, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        const isLast = i === STAGES.length - 1
        return (
          <li key={stage.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute top-10 left-[19px] h-[calc(100%-2.5rem)] w-0.5 ${done ? 'bg-clay' : 'bg-ink/10'}`}
                aria-hidden
              />
            )}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${
                done
                  ? 'border-clay bg-clay text-white'
                  : active
                    ? 'border-clay bg-white text-clay'
                    : 'border-ink/12 bg-white text-warm-light'
              }`}
              aria-hidden
            >
              {done ? (
                <Check size={16} strokeWidth={3} />
              ) : active ? (
                <>
                  <stage.icon size={16} strokeWidth={2} />
                  <span
                    className="absolute inset-0 rounded-full border-2 border-clay"
                    style={{ animation: 'pulse-ring 2s ease-out infinite' }}
                  />
                </>
              ) : (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </motion.span>
            <div className={`pt-1.5 ${done || active ? '' : 'opacity-55'}`}>
              <p className={`text-[15px] font-semibold ${active ? 'text-clay' : 'text-ink'}`}>
                {stage.label}
                {active && (
                  <span className="ml-2 inline-block rounded-full bg-clay-soft px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-clay uppercase">
                    In progress
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[13.5px] text-warm">{stage.desc}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function OrderTrackingPage() {
  const { id } = useParams()
  const { user, booting } = useAuth()
  const { settings } = useData()
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(20)

  useEffect(() => {
    window.scrollTo(0, 0)
    let alive = true
    async function load() {
      if (booting) return
      if (!user) {
        if (alive) {
          setError('login')
          setLoading(false)
        }
        return
      }
      try {
        const d = await api.get(`/orders/${id}/tracking`)
        if (alive) setOrder(d.order)
      } catch (e) {
        if (alive) setError(e.status === 404 ? 'notfound' : e.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [id, user, booting])

  useEffect(() => {
    if (!order) return
    const target = 20 + (order.stage || 0) * 20
    const t = setInterval(() => setProgress((p) => Math.min(p + 3, target)), 300)
    return () => clearInterval(t)
  }, [order])

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center pt-24">
        <Spinner size={28} />
      </div>
    )
  }

  if (error === 'login') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-40">
        <div className="rounded-panel border border-ink/6 bg-white shadow-soft">
          <EmptyState
            icon={Clock3}
            title="Sign in to track your order"
            message="Order tracking is tied to your account so your progress is always saved."
            action={
              <Link to={`/login?next=/track/${id}`}>
                <Button size="lg">Log in</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-40">
        <div className="rounded-panel border border-ink/6 bg-white shadow-soft">
          <EmptyState
            icon={PackageSearch}
            title="Order not found"
            message={typeof error === 'string' && error !== 'notfound' ? error : 'This order number doesn’t exist or belongs to another account.'}
            action={
              <Link to="/account/orders">
                <Button>View my orders</Button>
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const eta = order.orderStatus === 'Delivered' ? 'Delivered' : order.etaMinutes > 0 ? `${order.etaMinutes} minutes remaining` : 'Arriving now'
  const pct = Math.max(progress, 12 + (order.stage || 0) * 18)
  const statusLabel = order.orderStatus
  const itemRows = order.items.map((i, ix) => ({ key: ix, name: i.name, qty: i.qty, price: i.price ?? 0 }))

  return (
    <>
      <PageHeader
        compact
        dark
        eyebrow="Live tracking"
        title={`Order #${order.orderNumber ?? order.number}`}
        subtitle={`${eta} · Placed ${new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
      />

      <section className="mx-auto max-w-[1440px] px-5 py-10 lg:px-10 lg:py-14" aria-label="Tracking details">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
          <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-medium">Order Status</h2>
                <p className="mt-1 text-[13.5px] text-warm">Live updates refresh automatically</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-clay-soft px-4 py-2 text-[12.5px] font-bold text-clay">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-clay" />
                </span>
                {statusLabel}
              </span>
            </div>

            <div className="mb-8">
              <div className="mb-2 flex justify-between text-[12.5px] font-medium text-warm">
                <span>Order placed</span>
                <span>{pct}% complete</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-beige"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Order progress"
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-clay-dark to-clay"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            <Timeline activeIndex={order.stage ?? 0} cancelled={order.orderStatus === 'Cancelled'} />
          </div>

          <div className="space-y-5">
            <Reveal>
              <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
                <h2 className="font-display text-lg font-medium">Delivery Details</h2>
                <div className="mt-4 space-y-4 text-[14px]">
                  <p className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-beige text-ink-600">
                      <Clock3 size={15} />
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold tracking-[0.14em] text-warm uppercase">ETA</span>
                      <span className="font-medium text-ink">{eta}</span>
                    </span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-beige text-ink-600">
                      <MapPin size={15} />
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold tracking-[0.14em] text-warm uppercase">
                        {order.fulfillment === 'pickup' ? 'Pickup' : 'Address'}
                      </span>
                      <span className="font-medium text-ink">{order.address}</span>
                    </span>
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-beige text-ink-600">
                      <Store size={15} />
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold tracking-[0.14em] text-warm uppercase">Restaurant</span>
                      <span className="font-medium text-ink">{settings.name || restaurant.name}</span>
                      <span className="block text-[13px] text-warm">{settings.address || restaurant.address}</span>
                      <a href={`tel:${(settings.phone || restaurant.phone).replace(/\s/g, '')}`} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-clay hover:underline">
                        <Phone size={12} /> {settings.phone || restaurant.phone}
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
                <h2 className="font-display text-lg font-medium">Order Items</h2>
                <ul className="mt-4 divide-y divide-ink/6">
                  {itemRows.map((it) => (
                    <li key={it.key} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                      <span className="text-ink-600">
                        <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-beige text-[11.5px] font-bold text-ink">
                          {it.qty}
                        </span>
                        {it.name}
                      </span>
                      <span className="font-semibold tabular-nums">${(it.price * it.qty).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-ink/8 pt-3.5">
                  <span className="text-sm font-medium text-warm">Total</span>
                  <span className="font-display text-xl font-medium">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </Reveal>

            <div className="flex flex-col gap-3">
              <Link to="/menu">
                <Button variant="outline" className="w-full" size="lg">
                  Order again
                </Button>
              </Link>
              <Button variant="ghost" className="w-full" onClick={() => window.print()}>
                <Printer size={15} /> Print receipt
              </Button>
              <Link to="/contact">
                <Button variant="ghost" className="w-full">
                  Need help? Contact us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

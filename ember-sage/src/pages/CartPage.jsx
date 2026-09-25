import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Tag, X, ShieldCheck, Truck, Lock } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { CartLine } from '../components/layout/CartDrawer.jsx'
import Button from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { EmptyState, Reveal } from '../components/ui/Motion.jsx'
import { AnimatePresence } from 'framer-motion'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { FREE_DELIVERY_THRESHOLD } from '../data/menu.js'

export function OrderSummary({ compact = false }) {
  const { totals, coupon } = useCart()
  return (
    <div className={`rounded-card border border-ink/6 bg-white p-5 shadow-soft ${compact ? '' : 'lg:sticky lg:top-28'}`}>
      <h2 className="font-display text-lg font-medium">Order Summary</h2>
      <dl className="mt-4 space-y-2.5 text-[14.5px]">
        <div className="flex justify-between text-warm">
          <dt>Subtotal</dt>
          <dd className="font-medium text-ink tabular-nums">${totals.subtotal.toFixed(2)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-olive">
            <dt>Discount {coupon && `(${coupon.code})`}</dt>
            <dd className="font-medium tabular-nums">−${totals.discount.toFixed(2)}</dd>
          </div>
        )}
        <div className="flex justify-between text-warm">
          <dt>Delivery Fee</dt>
          <dd className="font-medium text-ink tabular-nums">
            {totals.deliveryFee === 0 ? (totals.subtotal > 0 ? 'Free' : '—') : `$${totals.deliveryFee.toFixed(2)}`}
          </dd>
        </div>
        <div className="flex justify-between text-warm">
          <dt>Tax (10%)</dt>
          <dd className="font-medium text-ink tabular-nums">${totals.tax.toFixed(2)}</dd>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-ink/8 pt-3.5 text-[17px] font-semibold text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">${totals.total.toFixed(2)}</dd>
        </div>
      </dl>
      {totals.subtotal > 0 && totals.subtotal < FREE_DELIVERY_THRESHOLD && (
        <p className="mt-4 rounded-xl bg-olive-soft px-3.5 py-2.5 text-[13px] text-olive-dark">
          Add <strong>${(FREE_DELIVERY_THRESHOLD - totals.subtotal).toFixed(2)}</strong> more for free delivery.
        </p>
      )}
    </div>
  )
}

export function CouponField() {
  const [code, setCode] = useState('')
  const { applyCoupon, removeCoupon, coupon } = useCart()
  const toast = useToast()

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-olive/30 bg-olive-soft px-4 py-3">
        <p className="flex items-center gap-2 text-[13.5px] font-medium text-olive-dark">
          <Tag size={14} /> {coupon.code} — {coupon.label}
        </p>
        <button
          type="button"
          onClick={removeCoupon}
          aria-label="Remove coupon"
          className="cursor-pointer text-olive-dark/70 transition hover:text-danger"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await applyCoupon(code)
        if (res.ok) toast.success('Coupon applied', res.message)
        else toast.error('Invalid coupon', res.message)
      }}
    >
      <label htmlFor="coupon" className="sr-only">
        Promo code
      </label>
      <input
        id="coupon"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter promo code (try WELCOME10)"
        className="h-11 min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-4 text-sm uppercase outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/15"
      />
      <Button type="submit" variant="dark" size="md">
        Apply
      </Button>
    </form>
  )
}

export default function CartPage() {
  const { items, totals } = useCart()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        compact
        eyebrow="Your order"
        title="Shopping Cart"
        subtitle="Review your dishes, apply a promo code, then head to checkout."
      />

      <section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-28" aria-label="Cart contents">
        {items.length === 0 ? (
          <div className="rounded-panel border border-ink/6 bg-white shadow-soft">
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              message="Once you add dishes, they’ll appear here ready for checkout."
              action={
                <Button size="lg" onClick={() => navigate('/menu')}>
                  Explore Menu
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[14px] text-warm">
                  {totals.count} item{totals.count > 1 ? 's' : ''} in your cart
                </p>
                <Link to="/menu" className="text-[13.5px] font-medium text-clay hover:underline">
                  + Add more dishes
                </Link>
              </div>
              <ul className="space-y-3.5">
                <AnimatePresence initial={false}>
                  {items.map((line) => (
                    <CartLine key={line.key} line={line} />
                  ))}
                </AnimatePresence>
              </ul>

              <Reveal className="mt-6 max-w-md">
                <CouponField />
              </Reveal>
            </div>

            <div className="space-y-4">
              <OrderSummary />
              <Button size="xl" className="w-full" onClick={() => navigate('/checkout')}>
                Proceed to Checkout <Lock size={15} />
              </Button>
              <div className="grid grid-cols-2 gap-3 text-[12.5px] text-warm">
                <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-soft">
                  <Truck size={14} className="text-olive" /> Free over ${FREE_DELIVERY_THRESHOLD}
                </p>
                <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-soft">
                  <ShieldCheck size={14} className="text-olive" /> Secure checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

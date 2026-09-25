import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, CreditCard, Banknote, Wallet, Lock, MapPin, Store } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { Input, Radio, Select, Textarea } from '../components/ui/Input.jsx'
import { EmptyState, Reveal } from '../components/ui/Motion.jsx'
import { OrderSummary, CouponField } from './CartPage.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { useData } from '../context/MenuContext.jsx'
import { api } from '../lib/api.js'
import { restaurant } from '../data/menu.js'

const STEPS = ['Cart', 'Delivery', 'Payment', 'Confirmation']

function StepIndicator({ current }) {
  return (
    <ol className="flex items-center justify-between gap-1 sm:gap-2" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo'
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span
                className={`h-px flex-1 ${i === 0 ? 'opacity-0' : state === 'todo' ? 'bg-ink/12' : 'bg-clay'}`}
                aria-hidden
              />
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: state === 'todo' ? '#E7DCC9' : '#C0522F',
                  scale: state === 'active' ? 1.08 : 1,
                }}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12.5px] font-bold ${
                  state === 'todo' ? 'text-warm' : 'text-white'
                }`}
                aria-hidden
              >
                {state === 'done' ? <Check size={14} strokeWidth={3} /> : i + 1}
              </motion.span>
              <span
                className={`h-px flex-1 ${i === STEPS.length - 1 ? 'opacity-0' : state === 'done' || state === 'active' ? 'bg-clay' : 'bg-ink/12'}`}
                aria-hidden
              />
            </div>
            <span
              className={`text-[11px] font-semibold tracking-wide uppercase ${
                state === 'active' ? 'text-clay' : state === 'done' ? 'text-ink' : 'text-warm-light'
              }`}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, Amex', icon: CreditCard },
  { id: 'online', label: 'Online Payment', desc: 'Easypaisa, JazzCash, Stripe', icon: Wallet },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay the rider at your door', icon: Banknote },
]

export default function CheckoutPage() {
  const { items, totals, clearCart, coupon, toApiItems } = useCart()
  const { user, booting } = useAuth()
  const { notify } = useNotifications()
  const { settings } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [placing, setPlacing] = useState(false)
  const [method, setMethod] = useState('delivery')
  const [payment, setPayment] = useState('card')
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: 'Islamabad',
    postal: '',
    instructions: '',
    pickupTime: 'ASAP (15–25 min)',
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardName: '',
  })

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        firstName: f.firstName || user.firstName || '',
        lastName: f.lastName || user.lastName || '',
        email: f.email || user.email || '',
        phone: f.phone || user.phone || '',
      }))
    }
  }, [user])

  useEffect(() => {
    if (!user && !booting) {
      toast.info('Sign in to checkout', 'Orders and progress are saved to your account.')
      navigate('/login', { state: { from: '/checkout' } })
    }
  }, [user, booting, navigate, toast])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const orderNumber = useMemo(() => String(10257 + Math.floor(Math.random() * 40)), [])

  if (items.length === 0 && step < 4) {
    return (
      <>
        <PageHeader compact eyebrow="Checkout" title="Checkout" />
        <div className="mx-auto max-w-2xl px-5 pb-24">
          <div className="rounded-panel border border-ink/6 bg-white shadow-soft">
            <EmptyState
              icon={MapPin}
              title="Nothing to check out"
              message="Your cart is empty — add a few dishes first."
              action={
                <Button onClick={() => navigate('/menu')} size="lg">
                  Explore Menu
                </Button>
              }
            />
          </div>
        </div>
      </>
    )
  }

  const validateDelivery = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email required'
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone)) errs.phone = 'Valid phone required'
    if (method === 'delivery') {
      if (!form.address.trim()) errs.address = 'Street address required'
      if (!form.city.trim()) errs.city = 'Required'
      if (!form.postal.trim()) errs.postal = 'Required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validatePayment = () => {
    if (payment !== 'card') return true
    const errs = {}
    if (form.cardNumber.replace(/\s/g, '').length < 16) errs.cardNumber = 'Enter a 16-digit card number'
    if (!/^\d{2}\s?\/\s?\d{2}$/.test(form.expiry)) errs.expiry = 'MM / YY'
    if (form.cvv.length < 3) errs.cvv = 'CVV'
    if (!form.cardName.trim()) errs.cardName = 'Cardholder name required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const placeOrder = async () => {
    if (!user) {
      toast.info('Sign in to checkout', 'Your order progress is saved to your account.')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    if (!validatePayment()) {
      toast.error('Check payment details', 'Please fix the highlighted fields.')
      return
    }
    setPlacing(true)
    try {
      const d = await api.post('/orders', {
        items: toApiItems(items),
        fulfillment: method,
        address:
          method === 'delivery'
            ? {
                line: form.address,
                apartment: form.apartment,
                city: form.city,
                postal: form.postal,
                instructions: form.instructions,
              }
            : undefined,
        pickupTime: method === 'pickup' ? form.pickupTime : undefined,
        payment: {
          method: payment,
          cardNumber: payment === 'card' ? form.cardNumber : undefined,
          expiry: payment === 'card' ? form.expiry : undefined,
          cvv: payment === 'card' ? form.cvv : undefined,
        },
        notes: '',
        couponCode: coupon?.code,
        contact: { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone },
      })

      const o = d.order
      const order = {
        number: o.orderNumber,
        date: new Date(o.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        eta: method === 'pickup' ? `${o.etaMinutes} minutes` : `${o.etaMinutes} minutes`,
        payment:
          payment === 'cod'
            ? 'Cash on Delivery'
            : payment === 'online'
              ? 'Online Payment'
              : `Card ending ${String(form.cardNumber).replace(/\D/g, '').slice(-4)}`,
        total: o.total,
        method,
        address:
          method === 'delivery'
            ? `${form.address}${form.apartment ? `, ${form.apartment}` : ''}, ${form.city} ${form.postal}`
            : `Pickup · ${settings.address || restaurant.address}`,
        email: form.email,
        name: `${form.firstName} ${form.lastName}`,
        items: items.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      }
      sessionStorage.setItem('es_last_order', JSON.stringify(order))
      notify({ type: 'order', title: `Order #${o.orderNumber} confirmed`, message: 'We’ve received your order and payment.' })
      clearCart()
      setStep(3)
      navigate('/order-confirmed', { state: { order }, replace: true })
    } catch (err) {
      if (err.status === 402) {
        toast.error('Payment declined', err.message)
      } else if (err.status === 401) {
        navigate('/login', { state: { from: '/checkout' } })
        toast.info('Session expired', 'Please log in again to complete your order.')
      } else {
        toast.error('Order failed', err.message)
      }
    } finally {
      setPlacing(false)
    }
  }

  const nextFromInfo = () => {
    if (validateDelivery()) setStep(2)
    else toast.error('Missing information', 'Please complete the highlighted fields.')
  }

  return (
    <>
      <PageHeader compact eyebrow="Checkout" title="Complete your order" subtitle="Delivery or pickup — a few quick steps and dinner is on its way.">
        <div className="max-w-2xl">
          <StepIndicator current={step} />
        </div>
      </PageHeader>

      <section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-28">
        <div className="grid gap-6 lg:grid-cols-[1fr_370px] lg:gap-8">
          {/* Main column */}
          <div className="order-2 lg:order-1">
            <AnimatePresence mode="wait">
              {/* —— Step 1: info + delivery —— */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
                    <h2 className="font-display text-xl font-medium">Customer Information</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Input label="First Name" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
                      <Input label="Last Name" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
                      <Input label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
                      <Input label="Phone" type="tel" required value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
                    </div>
                  </div>

                  <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
                    <h2 className="font-display text-xl font-medium">Fulfilment</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Radio
                        name="method"
                        label="Delivery"
                        description="To your door in 35–45 min"
                        checked={method === 'delivery'}
                        onChange={() => setMethod('delivery')}
                      />
                      <Radio
                        name="method"
                        label="Pickup"
                        description="Ready in 15–20 min"
                        checked={method === 'pickup'}
                        onChange={() => setMethod('pickup')}
                      />
                    </div>

                    {method === 'delivery' ? (
                      <div className="mt-5 grid gap-4">
                        <Input label="Address" required placeholder="Street address" value={form.address} onChange={set('address')} error={errors.address} />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input label="Apartment / Suite" placeholder="Optional" value={form.apartment} onChange={set('apartment')} />
                          <Input label="City" required value={form.city} onChange={set('city')} error={errors.city} />
                          <Input label="Postal Code" required placeholder="44000" value={form.postal} onChange={set('postal')} error={errors.postal} />
                        </div>
                        <Textarea label="Delivery Instructions" rows={2} placeholder="Gate code, landmarks, where to knock…" value={form.instructions} onChange={set('instructions')} />
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4 rounded-xl bg-beige p-5 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div>
                          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-clay uppercase">
                            <Store size={13} /> Pickup location
                          </p>
                          <p className="mt-1.5 text-[15px] font-medium text-ink">{settings.name || restaurant.name}</p>
                          <p className="text-[13.5px] text-warm">{settings.address || restaurant.address}</p>
                          <p className="text-[13.5px] text-warm">{settings.phone || restaurant.phone}</p>
                        </div>
                        <Select label="Pickup time" value={form.pickupTime} onChange={set('pickupTime')} className="sm:min-w-52">
                          {['ASAP (15–25 min)', 'In 30 minutes', 'In 45 minutes', 'In 1 hour', 'Tonight, 7:00 PM', 'Tonight, 8:30 PM'].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-3">
                    <Link to="/cart">
                      <Button variant="ghost" size="lg">
                        <ChevronLeft size={16} /> Back to cart
                      </Button>
                    </Link>
                    <Button size="lg" onClick={nextFromInfo} className="min-w-52">
                      Continue to Payment
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* —— Step 2: payment —— */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-medium">Payment Method</h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-olive-soft px-3 py-1.5 text-[11.5px] font-semibold text-olive-dark">
                        <Lock size={12} /> Secure &amp; encrypted
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {PAYMENT_METHODS.map((m) => (
                        <Radio
                          key={m.id}
                          name="payment"
                          label={<span className="flex items-center gap-2"><m.icon size={16} /> {m.label}</span>}
                          description={m.desc}
                          checked={payment === m.id}
                          onChange={() => setPayment(m.id)}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {payment === 'card' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 grid gap-4 rounded-xl border border-ink/8 bg-beige/50 p-5">
                            <Input
                              label="Card Number"
                              inputMode="numeric"
                              placeholder="4242 4242 4242 4242"
                              value={form.cardNumber}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  cardNumber: e.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 16)
                                    .replace(/(\d{4})(?=\d)/g, '$1 '),
                                })
                              }
                              error={errors.cardNumber}
                              autoComplete="cc-number"
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="Expiry Date"
                                placeholder="MM / YY"
                                value={form.expiry}
                                onChange={(e) => {
                                  let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                                  if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2)
                                  setForm({ ...form, expiry: v })
                                }}
                                error={errors.expiry}
                                autoComplete="cc-exp"
                              />
                              <Input
                                label="CVV"
                                type="password"
                                inputMode="numeric"
                                placeholder="•••"
                                maxLength={4}
                                value={form.cvv}
                                onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '') })}
                                error={errors.cvv}
                                autoComplete="cc-csc"
                              />
                            </div>
                            <Input
                              label="Cardholder Name"
                              placeholder="Name on card"
                              value={form.cardName}
                              onChange={set('cardName')}
                              error={errors.cardName}
                              autoComplete="cc-name"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {payment === 'cod' && (
                      <p className="mt-4 rounded-xl bg-warning-soft px-4 py-3 text-[13.5px] text-warning">
                        Please keep exact change ready — riders carry limited cash.
                      </p>
                    )}
                  </div>

                  {/* Mobile summary (above pay button) */}
                  <div className="lg:hidden">
                    <OrderSummary compact />
                    <div className="mt-3">
                      <CouponField />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
                      <ChevronLeft size={16} /> Back
                    </Button>
                    <Button size="lg" onClick={placeOrder} loading={placing} className="min-w-56">
                      {placing ? 'Placing order…' : `Place Order · $${totals.total.toFixed(2)}`}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop summary */}
          <aside className="order-1 space-y-4 lg:order-2">
            <div className="rounded-card border border-ink/6 bg-white p-5 shadow-soft">
              <h2 className="font-display text-lg font-medium">
                Your Order <span className="ml-1 text-[13px] font-sans font-normal text-warm">({totals.count})</span>
              </h2>
              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {items.map((l) => (
                  <li key={l.key} className="flex items-center gap-3">
                    <img src={l.image || '/images/kitchen.jpg'} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{l.name}</p>
                      <p className="text-[12px] text-warm">
                        {l.size === 'large' ? 'Large' : 'Regular'}
                        {l.addons?.length ? ` + ${l.addons.map((a) => a.label).join(', ')}` : ''} × {l.qty}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-semibold tabular-nums">
                      ${(l.price * l.qty + (l.size === 'large' ? 4 * l.qty : 0) + (l.addons || []).reduce((s, a) => s + a.price * l.qty, 0)).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-ink/8 pt-4">
                <CouponField />
              </div>
            </div>
            <div className="hidden lg:block">
              <OrderSummary />
            </div>
            <p className="flex items-center justify-center gap-2 text-[12.5px] text-warm">
              <Lock size={13} /> Payments processed over TLS · PCI-DSS compliant
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CreditCard,
  Heart,
  Home,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  Settings,
  ShoppingBag,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { EmptyState, Reveal } from '../components/ui/Motion.jsx'
import { Input, Select, Checkbox } from '../components/ui/Input.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { FoodCard } from '../components/menu/FoodCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../lib/api.js'

const NAV = [
  { to: '/account', label: 'Profile', icon: User, end: true },
  { to: '/account/orders', label: 'Orders', icon: Receipt },
  { to: '/account/favorites', label: 'Favorites', icon: Heart },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/payments', label: 'Payment Methods', icon: CreditCard },
  { to: '/account/settings', label: 'Settings', icon: Settings },
]

function AccountShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3.5 border-b border-ink/8 px-5 py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg text-cream" aria-hidden>
          {(user?.firstName?.[0] || 'G') + (user?.lastName?.[0] || '')}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">
            {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
          </p>
          <p className="truncate text-[12.5px] text-warm">{user?.email}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Account sections">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition ${
                isActive ? 'bg-ink text-cream shadow-soft' : 'text-ink-600 hover:bg-beige hover:text-ink'
              }`
            }
          >
            <n.icon size={17} strokeWidth={1.8} />
            {n.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-danger transition hover:bg-danger-soft"
        >
          <LogOut size={17} strokeWidth={1.8} /> Logout
        </button>
      </nav>
      <div className="border-t border-ink/8 px-5 py-4">
        <Link to="/menu" className="text-[13px] font-medium text-clay hover:underline">
          ← Back to ordering
        </Link>
      </div>
    </div>
  )

  return (
    <div className="pt-[72px]">
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10 lg:py-12">
        <div className="mb-7 flex items-center justify-between lg:hidden">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-clay uppercase">Account</p>
            <h1 className="mt-1 font-display text-3xl font-medium">My Account</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Open account menu">
            Menu
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[270px_1fr] lg:gap-8">
          <aside className="sticky top-24 hidden h-fit overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft lg:block">
            {sidebar}
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[95] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/50"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-[82vw] max-w-xs bg-white shadow-lift"
              role="dialog"
              aria-label="Account menu"
            >
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <Reveal className="mb-6 rounded-card border border-ink/6 bg-white p-6 shadow-soft sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium">{title}</h2>
          {subtitle && <p className="mt-1 text-[13.5px] text-warm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Reveal>
  )
}

function SectionHead({ eyebrow, title }) {
  return (
    <div className="mb-6 hidden lg:block">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-clay uppercase">{eyebrow}</p>
      <h1 className="mt-1.5 font-display text-[34px] leading-tight font-medium">{title}</h1>
    </div>
  )
}

/* ————————— Profile ————————— */
function ProfileSection() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ orders: 0, spent: 0, points: 0 })

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    })
  }, [user])

  useEffect(() => {
    api
      .get('/orders/mine')
      .then((d) => {
        const valid = d.orders.filter((o) => o.orderStatus !== 'Cancelled')
        const spent = valid.reduce((s, o) => s + o.total, 0)
        setStats({ orders: valid.length, spent: Math.round(spent * 100) / 100, points: Math.floor(spent * 2) })
      })
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile(form)
      setEditing(false)
      toast.success('Profile updated', 'Your changes have been saved to your account.')
    } catch (e) {
      toast.error('Update failed', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between lg:hidden">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-clay uppercase">Account</p>
          <h1 className="mt-1 font-display text-[34px] leading-tight font-medium">My Profile</h1>
        </div>
        <Badge tone="olive" size="md">
          Member since {user?.joined ? new Date(user.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2025'}
        </Badge>
      </div>

      <SectionCard
        title="Personal Information"
        subtitle="Keep your details fresh for faster checkout."
        action={
          <Button variant={editing ? 'primary' : 'outline'} size="sm" onClick={editing ? save : () => setEditing(true)} loading={saving}>
            {editing ? 'Save Profile' : (<><Pencil size={14} /> Edit Profile</>)}
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} disabled={!editing} />
          <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} disabled={!editing} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!editing} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!editing} />
        </div>
      </SectionCard>

      <div className="grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Total Orders', value: String(stats.orders) },
          { label: 'Total Spent', value: `$${stats.spent.toLocaleString()}` },
          { label: 'Reward Points', value: String(stats.points) },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <div className="rounded-card border border-ink/6 bg-white p-5 text-center shadow-soft">
              <p className="font-display text-3xl font-medium text-ink">{s.value}</p>
              <p className="mt-1 text-[12px] font-medium tracking-wide text-warm uppercase">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}

/* ————————— Orders ————————— */
function OrdersSection() {
  const toast = useToast()
  const navigate = useNavigate()
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    api.get('/orders/mine').then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  }, [])

  const statusTone = { Delivered: 'success', Preparing: 'warning', Cancelled: 'danger', Pending: 'warning', Confirmed: 'info', Ready: 'info', 'Out for Delivery': 'clay' }

  if (orders === null) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-36 rounded-card" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <>
        <SectionHead eyebrow="History" title="My Orders" />
        <div className="rounded-card border border-ink/6 bg-white shadow-soft">
          <EmptyState
            icon={Receipt}
            title="No orders yet"
            message="When you place your first order, it will show up here with live tracking."
            action={
              <Link to="/menu">
                <Button>Browse menu</Button>
              </Link>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <SectionHead eyebrow="History" title="My Orders" />
      <div className="space-y-4">
        {orders.map((o, i) => (
          <Reveal key={o._id} delay={i * 0.05}>
            <article className="rounded-card border border-ink/6 bg-white p-5 shadow-soft transition hover:shadow-lift sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-lg font-medium">Order #{o.orderNumber}</h2>
                    <Badge tone={statusTone[o.orderStatus] || 'neutral'}>{o.orderStatus}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-warm">
                    {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
                    Paid by {o.paymentMethod === 'cod' ? 'Cash' : o.paymentMethod === 'online' ? 'Online' : 'Card'}
                    {o.couponCode ? ` · ${o.couponCode}` : ''}
                  </p>
                </div>
                <p className="font-display text-xl font-medium">${o.total.toFixed(2)}</p>
              </div>
              <ul className="mt-3.5 flex flex-wrap gap-2">
                {o.items.map((it, ix) => (
                  <li key={ix} className="rounded-full bg-beige px-3 py-1 text-[12.5px] text-ink-600">
                    {it.qty} × {it.name}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2.5 border-t border-ink/6 pt-4">
                <Button size="sm" variant="outline" onClick={() => navigate(`/track/${o.orderNumber}`)}>
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="dark"
                  onClick={() => {
                    toast.success('Added to cart', `Reordered items from #${o.orderNumber}`)
                    navigate('/cart')
                  }}
                  disabled={o.orderStatus === 'Cancelled'}
                >
                  <ShoppingBag size={14} /> Reorder
                </Button>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  )
}

/* ————————— Favorites ————————— */
function FavoritesSection() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    api.get('/users/me/favorites').then((d) => setItems(d.items)).catch(() => setItems([]))
  }, [])

  if (items === null) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton aspect-[4/3] rounded-card" />
        ))}
      </div>
    )
  }

  return (
    <>
      <SectionHead eyebrow="Saved" title="Favorites" />
      {items.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white shadow-soft">
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            message="Tap the heart on any dish to save it here — it syncs to your account."
            action={
              <Link to="/menu">
                <Button>Browse menu</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item, i) => (
            <FoodCard key={item._id} item={item} index={i} />
          ))}
        </div>
      )}
    </>
  )
}

/* ————————— Addresses ————————— */
function AddressesSection() {
  const [list, setList] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ label: 'Home', line: '', city: 'Islamabad', postal: '', phone: '' })
  const toast = useToast()

  const load = () => api.get('/users/me/addresses').then((d) => setList(d.addresses)).catch(() => setList([]))
  useEffect(() => {
    load()
  }, [])

  const makeDefault = async (id) => {
    try {
      await api.patch(`/users/me/addresses/${id}`, { isDefault: true })
      await load()
      toast.success('Default address updated')
    } catch (e) {
      toast.error('Could not update', e.message)
    }
  }

  const remove = async (id) => {
    try {
      await api.del(`/users/me/addresses/${id}`)
      await load()
      toast.info('Address removed')
    } catch (e) {
      toast.error('Could not remove', e.message)
    }
  }

  const add = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users/me/addresses', draft)
      setShowAdd(false)
      setDraft({ label: 'Home', line: '', city: 'Islamabad', postal: '', phone: '' })
      await load()
      toast.success('Address added')
    } catch (err) {
      toast.error('Could not save address', err.message)
    }
  }

  if (list === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-48 rounded-card" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 hidden items-end justify-between lg:flex">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-clay uppercase">Bookkeeping</p>
          <h1 className="mt-1.5 font-display text-[34px] leading-tight font-medium">Saved Addresses</h1>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Address
        </Button>
      </div>

      <div className="mb-4 flex justify-end lg:hidden">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Address
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white shadow-soft">
          <EmptyState icon={MapPin} title="No saved addresses" message="Add an address for faster one-tap checkout." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((a, i) => (
            <Reveal key={a._id} delay={i * 0.05}>
              <div className={`relative flex h-full flex-col rounded-card border bg-white p-5 shadow-soft ${a.isDefault ? 'border-clay' : 'border-ink/6'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-beige text-ink-600">
                      {a.label === 'Home' ? <Home size={15} /> : <MapPin size={15} />}
                    </span>
                    <span className="text-sm font-semibold">{a.label}</span>
                  </span>
                  {a.isDefault && <Badge tone="clay">Default</Badge>}
                </div>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-600">
                  {a.line}
                  <br />
                  {a.city} {a.postal}
                </p>
                <p className="mt-1 text-[13px] text-warm">{a.phone}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/6 pt-4">
                  {!a.isDefault && (
                    <Button size="xs" variant="outline" onClick={() => makeDefault(a._id)}>
                      Set as Default
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => remove(a._id)}
                  >
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Address" size="sm">
        <form onSubmit={add} className="space-y-4 p-6 pt-8">
          <Select label="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })}>
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </Select>
          <Input label="Street Address" required placeholder="House, street, sector" value={draft.line} onChange={(e) => setDraft({ ...draft, line: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <Input label="Postal Code" required placeholder="44000" value={draft.postal} onChange={(e) => setDraft({ ...draft, postal: e.target.value })} />
          </div>
          <Input label="Phone" type="tel" placeholder="+92 300 0000000" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          <Button type="submit" size="lg" className="w-full">
            Save Address
          </Button>
        </form>
      </Modal>
    </>
  )
}

/* ————————— Payments ————————— */
function PaymentsSection() {
  const toast = useToast()
  const { user, refreshUser } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ cardNumber: '', expiry: '', cvv: '', cardName: '' })
  const methods = user?.paymentMethods || []

  const add = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users/me/payment-methods', {
        cardNumber: form.cardNumber,
        expiry: form.expiry,
        holder: form.cardName,
        cvv: form.cvv,
      })
      await refreshUser()
      setShowAdd(false)
      setForm({ cardNumber: '', expiry: '', cvv: '', cardName: '' })
      toast.success('Card saved', 'Tokenized — only the last 4 digits are stored.')
    } catch (err) {
      toast.error('Could not save card', err.message)
    }
  }

  const remove = async (id) => {
    try {
      await api.del(`/users/me/payment-methods/${id}`)
      await refreshUser()
      toast.info('Card removed')
    } catch (err) {
      toast.error('Could not remove', err.message)
    }
  }

  const setDefault = async (id) => {
    try {
      await api.patch(`/users/me/payment-methods/${id}/default`)
      await refreshUser()
      toast.success('Default card updated')
    } catch (err) {
      toast.error('Could not update', err.message)
    }
  }

  return (
    <>
      <SectionHead eyebrow="Wallet" title="Payment Methods" />

      <div className="grid gap-4 sm:grid-cols-2">
        {methods.map((m, i) => (
          <Reveal key={m._id} delay={i * 0.05}>
            <div className="relative overflow-hidden rounded-card bg-ink p-6 text-cream shadow-lift">
              <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-clay/25" aria-hidden />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <CreditCard size={22} className="text-cream/70" />
                  {m.isDefault && <Badge tone="clay">Default</Badge>}
                </div>
                <p className="mt-8 font-display text-xl tracking-[0.18em]">•••• •••• •••• {m.last4}</p>
                <div className="mt-5 flex justify-between text-[12.5px] text-cream/60">
                  <span>{(m.holder || '').toUpperCase()}</span>
                  <span>
                    {m.expMonth}/{m.expYear}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  {!m.isDefault && (
                    <button type="button" onClick={() => setDefault(m._id)} className="cursor-pointer rounded-full border border-cream/25 px-3 py-1 text-[11.5px] transition hover:bg-cream/10">
                      Make default
                    </button>
                  )}
                  <button type="button" onClick={() => remove(m._id)} className="cursor-pointer rounded-full border border-cream/25 px-3 py-1 text-[11.5px] transition hover:bg-danger/30">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}

        <Reveal delay={0.06}>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex h-full min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-ink/15 bg-white/50 p-6 text-warm transition hover:border-clay hover:text-clay"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-beige">
              <Plus size={20} />
            </span>
            <span className="text-sm font-semibold">Add new card</span>
            <span className="text-[12.5px]">Visa, Mastercard, Amex</span>
          </button>
        </Reveal>
      </div>

      <p className="mt-5 flex items-center gap-2 text-[13px] text-warm">
        <Star size={14} className="fill-clay text-clay" /> Card details are tokenized — never stored on our servers.
      </p>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add payment method" size="sm">
        <form onSubmit={add} className="space-y-4 p-6 pt-8">
          <Input label="Card Number" required placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value.replace(/[^\d\s]/g, '').slice(0, 19) })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expiry" required placeholder="MM / YY" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
            <Input label="CVV" required type="password" maxLength={4} value={form.cvv} onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '') })} />
          </div>
          <Input label="Cardholder Name" required placeholder="Name on card" value={form.cardName} onChange={(e) => setForm({ ...form, cardName: e.target.value })} />
          <Button type="submit" size="lg" className="w-full">
            Save Card
          </Button>
        </form>
      </Modal>
    </>
  )
}

/* ————————— Settings ————————— */
function SettingsSection() {
  const toast = useToast()
  const { user, updatePreferences, updatePassword } = useAuth()
  const prefs = user?.preferences || {}
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    try {
      await updatePreferences({ [key]: next[key] })
      toast.success('Preference saved')
    } catch (e) {
      toast.error('Could not save', e.message)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.newPassword !== pw.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPw(true)
    try {
      await updatePassword(pw.currentPassword, pw.newPassword)
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error('Change failed', err.message)
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <>
      <SectionHead eyebrow="Preferences" title="Settings" />

      <SectionCard title="Notifications" subtitle="Choose how we keep you posted.">
        <ul className="space-y-4">
          {[
            { key: 'orderEmails', label: 'Order confirmations & status by email' },
            { key: 'sms', label: 'SMS alerts when the rider is close' },
            { key: 'promos', label: 'Promotional offers and seasonal menus' },
            { key: 'dimNight', label: 'Dim interface during evening hours' },
          ].map((p) => (
            <li key={p.key}>
              <Checkbox label={p.label} checked={Boolean(prefs[p.key])} onChange={() => toggle(p.key)} />
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Change Password" subtitle="Minimum 8 characters.">
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
          <Input label="Current Password" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
          <Input label="New Password" type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
          <Input label="Confirm New" type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
          <div className="sm:col-span-3">
            <Button type="submit" variant="dark" loading={savingPw}>
              Update Password
            </Button>
          </div>
        </form>
      </SectionCard>
    </>
  )
}

export {
  AccountShell,
  ProfileSection,
  OrdersSection,
  FavoritesSection,
  AddressesSection,
  PaymentsSection,
  SettingsSection,
}

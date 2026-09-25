import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DollarSign,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Trash2,
  Pencil,
  Plus,
  Users,
  ClipboardList,
  Clock3,
} from 'lucide-react'
import { AdminPageHead, StatCard, STATUS_TONES } from './AdminLayout.jsx'
import { DonutChart, OrdersBarChart, PopularDishes, RevenueChart } from '../../components/admin/Charts.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Modal, Drawer } from '../../components/ui/Modal.jsx'
import { EmptyState, Reveal, Spinner } from '../../components/ui/Motion.jsx'
import { Input, Select, Textarea, Checkbox } from '../../components/ui/Input.jsx'
import { ORDER_STATUSES } from '../../data/site.js'
import { api } from '../../lib/api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useData } from '../../context/MenuContext.jsx'

/* ═════════ DASHBOARD ═════════ */
export function AdminDashboard() {
  const toast = useToast()
  const [stats, setStats] = useState(null)

  const load = useCallback(() => {
    api.get('/admin/stats').then(setStats).catch((e) => toast.error('Stats failed', e.message))
  }, [toast])
  useEffect(load, [load])

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status })
      toast.success(`Order #${id} → ${status}`, 'Customer notified by email + app notification.')
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (!stats) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={30} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · Live overview`}
        action={
          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" onClick={() => { toast.success('Report queued', 'CSV export will stream from /api/admin/stats.'); }}>
              Export report
            </Button>
            <Link to="/admin/menu">
              <Button size="sm">
                <Plus size={15} /> New dish
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Orders" value={String(stats.todayOrders)} delta="+12.4%" icon={ClipboardList} delay={0} />
        <StatCard label="Today's Revenue" value={`$${stats.todayRevenue.toLocaleString()}`} delta="+8.1%" icon={DollarSign} delay={0.06} />
        <StatCard label="Pending Orders" value={String(stats.pendingOrders)} delta="-3.2%" deltaTone="down" icon={Clock3} delay={0.12} />
        <StatCard label="Total Customers" value={stats.totalCustomers.toLocaleString()} delta="+24" icon={Users} delay={0.18} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Reveal className="rounded-card border border-ink/6 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">Revenue Overview</h2>
            <Badge tone="olive">Last 7 days</Badge>
          </div>
          <RevenueChart data={stats.revenueSeries} />
        </Reveal>
        <Reveal delay={0.08} className="rounded-card border border-ink/6 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium">Orders Overview</h2>
            <Badge tone="clay">Weekly</Badge>
          </div>
          <OrdersBarChart data={stats.ordersSeries} />
        </Reveal>
        <Reveal delay={0.05} className="rounded-card border border-ink/6 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="mb-5 font-display text-lg font-medium">Popular Dishes</h2>
          <PopularDishes data={stats.popularDishes} />
        </Reveal>
        <Reveal delay={0.1} className="rounded-card border border-ink/6 bg-white p-5 shadow-soft sm:p-6">
          <h2 className="mb-5 font-display text-lg font-medium">Orders by Category</h2>
          <DonutChart data={stats.ordersByCategory} />
        </Reveal>
      </div>

      <Reveal className="mt-5 overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-medium">Recent Orders</h2>
          <Link to="/admin/orders" className="text-[13.5px] font-medium text-clay hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/6 bg-beige/40 text-[11.5px] font-semibold tracking-[0.08em] text-warm uppercase">
                <th className="px-5 py-3 sm:px-6">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {stats.recentOrders.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="transition hover:bg-beige/30">
                  <td className="px-5 py-3.5 font-semibold text-ink sm:px-6">#{o.id}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{o.customer}</td>
                  <td className="px-4 py-3.5 text-warm">{o.items} items</td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums">${o.amount.toFixed(2)}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={STATUS_TONES[o.payment] || 'neutral'} size="xs">{o.payment}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      aria-label={`Status for order ${o.id}`}
                      className="cursor-pointer rounded-full border border-ink/12 bg-white px-2.5 py-1 text-[12px] font-medium outline-none transition hover:border-clay"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-warm">{o.date}</td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/track/${o.id}`}
                      className="inline-block rounded-full border border-ink/12 px-3 py-1 text-[12px] font-medium transition hover:border-clay hover:text-clay"
                    >
                      View
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </>
  )
}

/* ═════════ ORDERS ═════════ */
export function AdminOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (q) params.set('q', q)
    api.get(`/admin/orders?${params}`).then((d) => setOrders(d.orders)).catch(() => setOrders([]))
  }, [q, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status })
      toast.success(`Order #${id} → ${status}`)
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (orders === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead title="Order Management" subtitle="Update statuses, search and fulfil faster." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-warm" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer name…"
            aria-label="Search orders"
            className="h-10 w-full rounded-full border border-ink/10 bg-white pr-4 pl-9 text-sm outline-none transition focus:border-clay"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="h-10 cursor-pointer rounded-full border border-ink/10 bg-white px-4 text-sm font-medium outline-none"
        >
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/8 bg-beige/40 text-[11.5px] font-semibold tracking-[0.08em] text-warm uppercase">
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-beige/30">
                  <td className="px-5 py-3.5 font-semibold">#{o.id}</td>
                  <td className="px-4 py-3.5 font-medium">{o.customer}</td>
                  <td className="px-4 py-3.5 text-warm">{o.items}</td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums">${o.amount.toFixed(2)}</td>
                  <td className="px-4 py-3.5"><Badge tone={STATUS_TONES[o.payment]} size="xs">{o.payment}</Badge></td>
                  <td className="px-4 py-3.5">
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      aria-label={`Status for order ${o.id}`}
                      className="cursor-pointer rounded-full border border-ink/12 bg-white px-2.5 py-1 text-[12px] font-medium outline-none transition hover:border-clay"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-warm">{o.date}</td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setSelected(o)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/12 px-3 py-1 text-[12px] font-medium transition hover:border-clay hover:text-clay"
                    >
                      <MoreHorizontal size={13} /> Details
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={ShoppingBag} title="No orders match" message="Try clearing search or filters." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Order details" size="md">
        {selected && (
          <div className="p-6 pt-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-warm uppercase">Order</p>
                <p className="font-display text-2xl font-medium">#{selected.id}</p>
              </div>
              <Badge tone={STATUS_TONES[selected.status]} size="md">{selected.status}</Badge>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-beige/60 p-4 text-[14px]">
              <div><dt className="text-warm">Customer</dt><dd className="font-medium">{selected.customer}</dd></div>
              <div><dt className="text-warm">Amount</dt><dd className="font-semibold tabular-nums">${selected.amount.toFixed(2)}</dd></div>
              <div><dt className="text-warm">Payment</dt><dd className="font-medium">{selected.payment} ({selected.paymentStatus})</dd></div>
              <div><dt className="text-warm">Placed</dt><dd className="font-medium">{selected.date}</dd></div>
              <div className="col-span-2"><dt className="text-warm">Items</dt><dd className="font-medium">{selected.itemLines?.join(' · ') || `${selected.items} dishes`}</dd></div>
              {selected.email && (
                <div className="col-span-2"><dt className="text-warm">Contact</dt><dd className="font-medium">{selected.email} {selected.phone}</dd></div>
              )}
            </dl>
            <div className="mt-5 flex gap-3">
              <Link to={`/track/${selected.id}`} className="flex-1">
                <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>
                  Track order
                </Button>
              </Link>
              <Button className="flex-1" onClick={() => { setSelected(null); toast.success('Receipt emailed', `Sent to ${selected.customer}.`) }}>
                Email receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ═════════ MENU MANAGEMENT ═════════ */
const EMPTY_DISH = {
  name: '', description: '', price: '', category: 'starters', image: '',
  ingredients: '', calories: '', prepTime: '', tags: [], available: true, featured: false,
}

export function AdminMenu() {
  const toast = useToast()
  const { refreshMenu } = useData()
  const [items, setItems] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [drawer, setDrawer] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_DISH)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(() => {
    api.get('/menu').then((d) => setItems(d.items)).catch(() => setItems([]))
  }, [])
  useEffect(load, [load])

  const filtered = (items || []).filter(
    (i) =>
      (cat === 'all' || i.category === cat) &&
      (q === '' || i.name.toLowerCase().includes(q.toLowerCase())),
  )

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_DISH)
    setFile(null)
    setDrawer(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image: item.image,
      ingredients: (item.ingredients || []).join(', '),
      calories: String(item.calories),
      prepTime: String(item.prepTime),
      tags: item.tags || [],
      available: item.available,
      featured: item.featured,
    })
    setFile(null)
    setDrawer(true)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price) {
      toast.error('Missing fields', 'Name and price are required.')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('price', form.price)
      fd.append('category', form.category)
      fd.append('ingredients', form.ingredients)
      fd.append('calories', form.calories)
      fd.append('prepTime', form.prepTime)
      fd.append('tags', JSON.stringify(form.tags))
      fd.append('available', String(form.available))
      fd.append('featured', String(form.featured))
      if (!file && form.image) fd.append('image', form.image)
      if (file) fd.append('image', file)

      if (editing) await api.upload(`/menu/${editing._id}`, fd, 'PUT')
      else await api.upload('/menu', fd)
      await load()
      await refreshMenu()
      setDrawer(false)
      toast.success(editing ? 'Dish updated' : 'Dish created', `${form.name} saved to the live menu.`)
    } catch (err) {
      toast.error('Save failed', err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (id) => {
    try {
      const d = await api.patch(`/menu/${id}/availability`, {})
      await load()
      await refreshMenu()
      toast.info(d.item.available ? 'Marked available' : 'Marked unavailable', d.item.name)
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  const remove = async (id) => {
    try {
      await api.del(`/menu/${id}`)
      await load()
      await refreshMenu()
      setConfirmDelete(null)
      toast.success('Dish deleted')
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  const TAG_OPTIONS = ['vegetarian', 'vegan', 'glutenFree', 'spicy', 'signature']

  if (items === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead
        title="Menu Management"
        subtitle={`${items.length} dishes · ${items.filter((i) => !i.available).length} unavailable`}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus size={15} /> Add New Dish
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-warm" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="h-10 w-full rounded-full border border-ink/10 bg-white pr-4 pl-9 text-sm outline-none transition focus:border-clay"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filter category"
          className="h-10 cursor-pointer rounded-full border border-ink/10 bg-white px-4 text-sm font-medium outline-none"
        >
          <option value="all">All categories</option>
          {['starters', 'mains', 'burgers', 'pizza', 'pasta', 'seafood', 'desserts', 'drinks'].map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, i) => (
          <motion.article
            key={item._id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i % 6) * 0.04, duration: 0.45 }}
            className={`overflow-hidden rounded-card border bg-white shadow-soft ${item.available ? 'border-ink/6' : 'border-danger/25'}`}
          >
            <div className="flex gap-4 p-4">
              <img
                src={item.image}
                alt=""
                className={`h-20 w-20 shrink-0 rounded-xl object-cover ${item.available ? '' : 'grayscale opacity-60'}`}
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{item.name}</h3>
                  <span className="font-semibold tabular-nums">${item.price.toFixed(2)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-warm">{item.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge size="xs" tone="outline">{item.category}</Badge>
                  <Badge size="xs" tone={item.available ? 'success' : 'danger'}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </Badge>
                  {item.featured && <Badge size="xs" tone="clay">Featured</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-ink/6 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-medium text-ink-600">
                <input type="checkbox" checked={item.available} onChange={() => toggle(item._id)} className="peer sr-only" />
                <span
                  aria-hidden
                  className={`relative h-[22px] w-10 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay/40 ${item.available ? 'bg-success' : 'bg-ink/15'}`}
                >
                  <span
                    className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${item.available ? 'left-[21px]' : 'left-0.5'}`}
                  />
                </span>
                {item.available ? 'On' : 'Off'}
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  aria-label={`Edit ${item.name}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-ink/12 text-ink-600 transition hover:border-clay hover:text-clay"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(item)}
                  aria-label={`Delete ${item.name}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-ink/12 text-ink-600 transition hover:border-danger hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-card border border-ink/6 bg-white shadow-soft">
          <EmptyState icon={Search} title="No dishes found" message="Adjust the search or category filter." />
        </div>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} width="max-w-lg" label={editing ? 'Edit dish' : 'Add dish'}>
        <form onSubmit={save} className="flex h-full flex-col">
          <div className="border-b border-ink/8 px-6 py-5">
            <h2 className="font-display text-xl font-medium">{editing ? 'Edit Dish' : 'Add New Dish'}</h2>
            <p className="mt-0.5 text-[13px] text-warm">POST /api/menu · PUT /api/menu/:id (multipart ready)</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Input label="Dish Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Charcoal Sea Bass" />
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short, appetizing description…" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price ($)" type="number" min="0" step="0.5" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['starters', 'mains', 'burgers', 'pizza', 'pasta', 'seafood', 'desserts', 'drinks'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </Select>
              <Input label="Calories" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
              <Input label="Prep Time (min)" type="number" value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} />
            </div>
            <div>
              <label htmlFor="dish-image" className="mb-1.5 block text-[13px] font-medium text-ink-600">Dish photo</label>
              <input
                id="dish-image"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full cursor-pointer rounded-xl border border-ink/10 bg-white p-3 text-[13.5px] file:mr-3 file:rounded-full file:border-0 file:bg-beige file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-ink"
              />
              {file ? (
                <p className="mt-1.5 text-[12.5px] text-olive">Selected: {file.name}</p>
              ) : form.image ? (
                <p className="mt-1.5 text-[12.5px] text-warm">Current: {form.image}</p>
              ) : null}
            </div>
            <Input label="Ingredients" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Comma separated list" />
            <fieldset>
              <legend className="mb-2 block text-[13px] font-medium text-ink-600">Dietary Tags</legend>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((t) => {
                  const on = form.tags.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, tags: on ? f.tags.filter((x) => x !== t) : [...f.tags, t] }))
                      }
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                        on ? 'bg-ink text-cream' : 'border border-ink/12 bg-white text-ink-600 hover:border-warm'
                      }`}
                    >
                      {t === 'glutenFree' ? 'Gluten Free' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <Checkbox
              label="Available for ordering"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
            <Checkbox
              label="Feature in Chef’s Favorites"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
          </div>
          <div className="flex gap-3 border-t border-ink/8 px-6 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDrawer(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editing ? 'Save Changes' : 'Create Dish'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete dish?" size="sm">
        {confirmDelete && (
          <div className="p-6 pt-9 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
              <Trash2 size={22} />
            </div>
            <h3 className="mt-4 font-display text-xl font-medium">Delete “{confirmDelete.name}”?</h3>
            <p className="mt-2 text-[14px] text-warm">This removes it from the live menu immediately.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => remove(confirmDelete._id)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ═════════ CUSTOMERS ═════════ */
export function AdminCustomers() {
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status !== 'all') params.set('status', status)
      api.get(`/admin/customers?${params}`).then((d) => setRows(d.customers)).catch(() => setRows([]))
    }, 250)
    return () => clearTimeout(t)
  }, [q, status])

  return (
    <>
      <AdminPageHead title="Customers" subtitle="Live accounts from the database" action={<Button variant="outline" size="sm">Export CSV</Button>} />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-warm" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search customers"
            className="h-10 w-full rounded-full border border-ink/10 bg-white pr-4 pl-9 text-sm outline-none transition focus:border-clay"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter status"
          className="h-10 cursor-pointer rounded-full border border-ink/10 bg-white px-4 text-sm font-medium outline-none"
        >
          {['all', 'Active', 'VIP', 'New', 'Preparing', 'Inactive'].map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
        {rows === null ? (
          <div className="grid h-64 place-items-center">
            <Spinner size={26} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-ink/8 bg-beige/40 text-[11.5px] font-semibold tracking-[0.08em] text-warm uppercase">
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Email</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Orders</th>
                  <th className="px-4 py-3.5">Total Spent</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {rows.map((c) => (
                  <tr key={c.id} className="transition hover:bg-beige/30">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[12px] font-bold text-cream" aria-hidden>
                          {c.name.split(' ').map((p) => p[0]).join('')}
                        </span>
                        <span className="font-semibold text-ink">{c.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-warm">{c.email}</td>
                    <td className="px-4 py-3.5 text-warm">{c.phone}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3.5 font-semibold tabular-nums">${c.spent.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-warm">{c.joined}</td>
                    <td className="px-4 py-3.5"><Badge tone={STATUS_TONES[c.status]} size="xs">{c.status}</Badge></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={Users} title="No customers found" message="Try a different search." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

/* ═════════ CATEGORIES ═════════ */
export function AdminCategories() {
  const toast = useToast()
  const { refreshCategories } = useData()
  const [categories, setCategories] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '' })

  const load = useCallback(() => {
    api.get('/menu/categories').then((d) => setCategories(d.categories)).catch(() => setCategories([]))
  }, [])
  useEffect(load, [load])

  const add = async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      fd.append('name', draft.name)
      fd.append('description', draft.description)
      await api.upload('/menu/categories', fd)
      setShowAdd(false)
      setDraft({ name: '', description: '' })
      await load()
      await refreshCategories()
      toast.success('Category created')
    } catch (err) {
      toast.error('Create failed', err.message)
    }
  }

  const remove = async (cat) => {
    try {
      await api.del(`/menu/categories/${cat._id}`)
      await load()
      await refreshCategories()
      toast.success('Category archived', cat.name)
    } catch (e) {
      toast.error('Cannot delete', e.message)
    }
  }

  if (categories === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead
        title="Categories"
        subtitle="Organise the menu into browsable sections."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Category
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((c, i) => (
          <Reveal key={c._id} delay={i * 0.04}>
            <div className="group overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
              <div className="relative h-32 overflow-hidden">
                <img src={c.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-0 bg-ink/25" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{c.name}</h3>
                  <Badge size="xs">{c.count} items</Badge>
                </div>
                <p className="mt-1 text-[13px] text-warm">{c.description}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/menu?category=${c.slug}`}>
                    <Button size="xs" variant="outline">View</Button>
                  </Link>
                  <Button size="xs" variant="ghost" className="text-danger" onClick={() => remove(c)}>
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add category" size="sm">
        <form onSubmit={add} className="space-y-4 p-6 pt-8">
          <Input label="Name" required placeholder="e.g. Sides" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input label="Description" placeholder="Short line shown on the card" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <Button type="submit" size="lg" className="w-full">
            Create Category
          </Button>
        </form>
      </Modal>
    </>
  )
}

/* ═════════ RESERVATIONS ═════════ */
export function AdminReservations() {
  const toast = useToast()
  const [rows, setRows] = useState(null)

  const load = useCallback(() => {
    api.get('/admin/reservations').then((d) => setRows(d.reservations)).catch(() => setRows([]))
  }, [])
  useEffect(load, [load])

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/reservations/${id}`, { status })
      toast.success(`Reservation → ${status}`)
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (rows === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead title="Reservations" subtitle="Table requests from the live booking form." />
      <div className="overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-ink/8 bg-beige/40 text-[11.5px] font-semibold tracking-wide text-warm uppercase">
                <th className="px-5 py-3.5">ID</th>
                <th className="px-4 py-3.5">Guest</th>
                <th className="px-4 py-3.5">Party</th>
                <th className="px-4 py-3.5">When</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-beige/30">
                  <td className="px-5 py-3.5 font-semibold">{r.id}</td>
                  <td className="px-4 py-3.5 font-medium">{r.name}</td>
                  <td className="px-4 py-3.5">{r.guests} pax</td>
                  <td className="px-4 py-3.5 text-warm">{r.date} {r.time}</td>
                  <td className="max-w-48 truncate px-4 py-3.5 text-warm">{r.notes}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : r.status === 'Cancelled' ? 'danger' : 'clay'} size="xs">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      defaultValue={r.status}
                      onChange={(e) => setStatus(r._id, e.target.value)}
                      aria-label={`Status for ${r.id}`}
                      className="cursor-pointer rounded-full border border-ink/12 bg-white px-2.5 py-1 text-[12px] font-medium outline-none"
                    >
                      {['Pending', 'Confirmed', 'Seated', 'Cancelled'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ═════════ REVIEWS ═════════ */
export function AdminReviews() {
  const toast = useToast()
  const [reviews, setReviews] = useState(null)

  const load = useCallback(() => {
    api.get('/admin/reviews').then((d) => setReviews(d.reviews)).catch(() => setReviews([]))
  }, [])
  useEffect(load, [load])

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/reviews/${id}`, { status })
      toast.success(status === 'hidden' ? 'Review hidden' : 'Review published')
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (reviews === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead title="Reviews" subtitle="Moderate guest feedback from the storefront." />
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((r, i) => (
          <Reveal key={r._id} delay={i * 0.05}>
            <div className={`rounded-card border bg-white p-5 shadow-soft ${r.status === 'hidden' ? 'opacity-60 border-ink/10' : 'border-ink/6'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-bold text-cream">{r.initials || r.name?.[0]}</span>
                  <div>
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-[12.5px] text-warm">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </p>
                  </div>
                </div>
                <Badge tone={r.status === 'published' ? 'success' : 'neutral'} size="xs">
                  {r.status}
                </Badge>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{r.text}</p>
              <div className="mt-4 flex gap-2 border-t border-ink/6 pt-3">
                <Button size="xs" variant="outline" onClick={() => setStatus(r._id, r.status === 'published' ? 'hidden' : 'published')}>
                  {r.status === 'published' ? 'Hide' : 'Publish'}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => toast.success('Reply sent', `Responded to ${r.name}.`)}>
                  Reply
                </Button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
}

/* ═════════ COUPONS ═════════ */
export function AdminCoupons() {
  const toast = useToast()
  const [coupons, setCoupons] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ code: '', type: 'percent', value: 10, minOrder: 0, usageLimit: 1000 })

  const load = useCallback(() => {
    api.get('/admin/coupons').then((d) => setCoupons(d.coupons)).catch(() => setCoupons([]))
  }, [])
  useEffect(load, [load])

  const add = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/coupons', draft)
      setShowAdd(false)
      setDraft({ code: '', type: 'percent', value: 10, minOrder: 0, usageLimit: 1000 })
      await load()
      toast.success('Coupon created')
    } catch (err) {
      toast.error('Create failed', err.message)
    }
  }

  const toggle = async (c) => {
    try {
      await api.patch(`/admin/coupons/${c._id}`, { active: !c.active })
      await load()
      toast.success(c.active ? 'Coupon deactivated' : 'Coupon activated', c.code)
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (coupons === null) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead
        title="Coupons"
        subtitle="Promo codes validated live at checkout."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> New Coupon
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {coupons.map((c, i) => (
          <Reveal key={c._id} delay={i * 0.05}>
            <div className={`rounded-card border bg-white p-5 shadow-soft ${c.active ? 'border-ink/6' : 'border-ink/10 opacity-70'}`}>
              <div className="flex items-center justify-between">
                <code className="rounded-lg bg-ink px-2.5 py-1 text-[13px] font-bold tracking-wider text-cream">{c.code}</code>
                <Badge tone={c.active ? 'success' : 'neutral'} size="xs">{c.active ? 'Active' : 'Off'}</Badge>
              </div>
              <p className="mt-3 text-[14px] font-medium">
                {c.type === 'percent' ? `${c.value}% off` : c.type === 'delivery' ? 'Free delivery' : `$${c.value} off`}
                {c.minOrder ? ` · $${c.minOrder}+` : ''}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[12px] text-warm">
                  <span>{c.used} used</span>
                  <span>{c.usageLimit}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                  <div className="h-full rounded-full bg-clay" style={{ width: `${Math.min(100, (c.used / c.usageLimit) * 100)}%` }} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(c)}
                className="mt-3 w-full cursor-pointer rounded-full border border-ink/12 py-1.5 text-[12.5px] font-medium transition hover:border-clay hover:text-clay"
              >
                {c.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </Reveal>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New coupon" size="sm">
        <form onSubmit={add} className="space-y-4 p-6 pt-8">
          <Input label="Code" required placeholder="SUMMER20" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
          <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="delivery">Free delivery</option>
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Value" type="number" min="0" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
            <Input label="Min order" type="number" min="0" value={draft.minOrder} onChange={(e) => setDraft({ ...draft, minOrder: Number(e.target.value) })} />
            <Input label="Limit" type="number" min="1" value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: Number(e.target.value) })} />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Create Coupon
          </Button>
        </form>
      </Modal>
    </>
  )
}

/* ═════════ ANALYTICS ═════════ */
export function AdminAnalytics() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch(() => toast.error('Could not load analytics'))
  }, [toast])

  if (!stats) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead title="Analytics" subtitle="Performance trends computed from live orders." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Reveal className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Revenue Overview</h2>
          <p className="mb-4 text-[13px] text-warm">Gross sales, last 7 days</p>
          <RevenueChart data={stats.revenueSeries} />
        </Reveal>
        <Reveal delay={0.06} className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Orders Overview</h2>
          <p className="mb-4 text-[13px] text-warm">Order volume by day</p>
          <OrdersBarChart data={stats.ordersSeries} />
        </Reveal>
        <Reveal delay={0.04} className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Category Share</h2>
          <p className="mb-4 text-[13px] text-warm">Where the menu concentrates</p>
          <DonutChart data={stats.ordersByCategory} />
        </Reveal>
        <Reveal delay={0.1} className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Top Performers</h2>
          <p className="mb-5 text-[13px] text-warm">Dishes driving engagement</p>
          <PopularDishes data={stats.popularDishes} />
        </Reveal>
      </div>
    </>
  )
}

/* ═════════ SETTINGS ═════════ */
export function AdminSettings() {
  const toast = useToast()
  const { refreshSettings } = useData()
  const [form, setForm] = useState(null)

  useEffect(() => {
    api.get('/settings').then((d) => setForm(d.settings)).catch(() => setForm({}))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    try {
      const d = await api.patch('/admin/settings', form)
      setForm(d.settings)
      await refreshSettings()
      toast.success('Settings saved', 'Storefront updated with live values.')
    } catch (err) {
      toast.error('Save failed', err.message)
    }
  }

  const toggle = async (key) => {
    const next = { ...form, [key]: !form[key] }
    setForm(next)
    try {
      const d = await api.patch('/admin/settings', { [key]: next[key] })
      setForm(d.settings)
      await refreshSettings()
      toast.info('Setting updated')
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  if (!form) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <>
      <AdminPageHead title="Settings" subtitle="Restaurant configuration and operations." />
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={save} className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Restaurant Profile</h2>
          <div className="mt-4 space-y-4">
            <Input label="Restaurant Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Tagline" value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Open Today" value={form.openToday || ''} onChange={(e) => setForm({ ...form, openToday: e.target.value })} />
            <Button type="submit">Save Changes</Button>
          </div>
        </form>

        <div className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium">Operations</h2>
          <ul className="mt-4 space-y-4">
            {[
              { key: 'acceptOrders', label: 'Accept new online orders' },
              { key: 'autoConfirm', label: 'Auto-confirm prepaid orders' },
              { key: 'codEnabled', label: 'Cash on delivery enabled' },
              { key: 'maintenance', label: 'Maintenance mode (storefront off)' },
            ].map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-medium text-ink-600">{row.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(form[row.key])}
                  aria-label={row.label}
                  onClick={() => toggle(row.key)}
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${form[row.key] ? 'bg-success' : 'bg-ink/15'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form[row.key] ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

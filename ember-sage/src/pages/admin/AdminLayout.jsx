import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Percent,
  MessageSquareHeart,
  CalendarDays,
  Users,
  UtensilsCrossed,
  ClipboardList,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react'
import Logo from '../../components/layout/Logo.jsx'
import Button from '../../components/ui/Button.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationsContext.jsx'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/categories', label: 'Categories', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareHeart },
  { to: '/admin/coupons', label: 'Coupons', icon: Percent },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const nav = (
    <nav className="flex h-full flex-col" aria-label="Admin navigation">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button
          type="button"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-beige lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close admin menu"
        >
          <X size={18} />
        </button>
      </div>
      <p className="px-6 pb-2 text-[10.5px] font-semibold tracking-[0.2em] text-warm uppercase">Manage</p>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-[13.5px] font-medium transition ${
                  isActive ? 'bg-clay text-white shadow-soft' : 'text-ink-600 hover:bg-beige hover:text-ink'
                }`
              }
            >
              <n.icon size={16} strokeWidth={1.8} />
              {n.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-ink/8 p-4">
        <Link
          to="/"
          className="mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-ink-600 transition hover:bg-beige"
        >
          ← View storefront
        </Link>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-danger transition hover:bg-danger-soft"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-svh bg-beige/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-ink/8 bg-white lg:block">{nav}</aside>

      {/* Mobile drawer */}
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
              className="absolute inset-y-0 left-0 w-[84vw] max-w-xs bg-white shadow-lift"
              role="dialog"
              aria-label="Admin menu"
            >
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink/8 bg-cream/92 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-beige lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open admin menu"
            >
              <MenuIcon size={20} />
            </button>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-clay uppercase">Admin</p>
              <p className="text-[14.5px] font-semibold text-ink">Ember &amp; Sage Control Room</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-beige"
              aria-label={`Notifications (${unreadCount})`}
            >
              <Bell size={18} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[9.5px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="hidden items-center gap-2.5 rounded-full border border-ink/8 bg-white py-1.5 pr-4 pl-1.5 shadow-soft sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[12px] font-bold text-cream">
                {(user?.firstName?.[0] || 'A') + (user?.lastName?.[0] || 'R')}
              </span>
              <span className="text-[13px] font-medium text-ink">
                {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
              </span>
              <ChevronDown size={14} className="text-warm" />
            </div>
            <Button size="sm" onClick={() => navigate('/admin/menu')}>
              Manage Menu
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/* Shared pieces for admin pages */

export function AdminPageHead({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-[-0.01em] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-warm">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, delta, deltaTone = 'up', icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-card border border-ink/6 bg-white p-5 shadow-soft"
    >
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-medium text-warm">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-clay-soft text-clay">
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 font-display text-[30px] leading-none font-medium tabular-nums">{value}</p>
      {delta && (
        <p className={`mt-2 text-[12.5px] font-medium ${deltaTone === 'up' ? 'text-success' : 'text-danger'}`}>
          {deltaTone === 'up' ? '▲' : '▼'} {delta}
          <span className="ml-1.5 font-normal text-warm">vs yesterday</span>
        </p>
      )}
    </motion.div>
  )
}

export const STATUS_TONES = {
  Pending: 'warning',
  Confirmed: 'info',
  Preparing: 'warning',
  Ready: 'info',
  'Out for Delivery': 'clay',
  Delivered: 'success',
  Cancelled: 'danger',
  Paid: 'success',
  COD: 'neutral',
  Failed: 'danger',
  Active: 'success',
  VIP: 'clay',
  New: 'info',
  Inactive: 'neutral',
}

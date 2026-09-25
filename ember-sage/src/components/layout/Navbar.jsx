import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  Clock3,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'
import Logo from './Logo.jsx'
import Button from '../ui/Button.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useNotifications } from '../../context/NotificationsContext.jsx'
import { useData } from '../../context/MenuContext.jsx'
import { restaurant } from '../../data/menu.js'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar({ onOpenSearch }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { totals, openCart } = useCart()
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const { settings, stats, getContent } = useData()
  const announcement = getContent('site.announcement', {})
  const location = useLocation()
  const navigate = useNavigate()
  const notifRef = useRef(null)
  const accountRef = useRef(null)

  const isHome = location.pathname === '/'
  const overHero = isHome && !scrolled
  const solid = !overHero

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setNotifOpen(false)
    setAccountOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const iconBtn = `relative grid h-10 w-10 place-items-center rounded-full transition-all duration-300 ${
    solid
      ? 'text-ink hover:bg-ink/[0.06]'
      : 'text-cream hover:bg-cream/10'
  }`

  return (
    <>
      {announcement.active && (announcement.title || announcement.subtitle) && (
        <div className={`relative z-40 px-5 py-2 text-center text-[12.5px] font-medium ${announcement.data?.tone === 'olive' ? 'bg-olive text-cream' : 'bg-clay text-white'}`}>
          {announcement.data?.href ? (
            <Link to={announcement.data.href} className="hover:underline">
              {announcement.title}
              {announcement.subtitle ? ` — ${announcement.subtitle}` : ''}
            </Link>
          ) : (
            <span>
              {announcement.title}
              {announcement.subtitle ? ` — ${announcement.subtitle}` : ''}
            </span>
          )}
        </div>
      )}
      <header
        className={`fixed inset-x-0 top-0 z-[80] transition-all duration-500 ${
          solid
            ? 'bg-cream/92 shadow-[0_1px_0_rgba(23,20,15,0.06),0_8px_30px_rgba(23,20,15,0.05)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <Logo light={!solid} />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `relative rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-300 ${
                    solid
                      ? isActive
                        ? 'text-ink'
                        : 'text-ink-600 hover:text-ink'
                      : isActive
                        ? 'text-cream'
                        : 'text-cream/70 hover:text-cream'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      <motion.span
                        layoutId={solid ? 'nav-pill-solid' : 'nav-pill-light'}
                        className="absolute inset-0 -z-10 rounded-full bg-clay/12"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              className={`${iconBtn} hidden sm:grid`}
              onClick={onOpenSearch}
              aria-label="Search menu"
            >
              <Search size={19} strokeWidth={1.8} />
            </button>

            {user && (
              <div className="relative hidden sm:block" ref={notifRef}>
                <button
                  type="button"
                  className={iconBtn}
                  aria-label={`Notifications (${unreadCount} unread)`}
                  onClick={() => {
                    setNotifOpen((v) => !v)
                    setAccountOpen(false)
                  }}
                >
                  <Bell size={19} strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[9.5px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.22 }}
                      className="absolute right-0 mt-3 w-[330px] overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-lift"
                    >
                      <div className="flex items-center justify-between border-b border-ink/6 px-4 py-3">
                        <p className="text-sm font-semibold">Notifications</p>
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[12px] font-medium text-clay hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <ul className="max-h-[320px] divide-y divide-ink/5 overflow-y-auto">
                        {notifications.length === 0 && (
                          <li className="px-4 py-8 text-center text-sm text-warm">You’re all caught up.</li>
                        )}
                        {notifications.slice(0, 6).map((n) => (
                          <li key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-clay-soft/40'}`}>
                            <p className="text-[13.5px] font-medium text-ink">{n.title}</p>
                            <p className="mt-0.5 text-[12.5px] leading-snug text-warm">{n.message}</p>
                            <p className="mt-1 text-[11px] text-warm-light">{n.time}</p>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user ? (
              <div className="relative hidden sm:block" ref={accountRef}>
                <button
                  type="button"
                  className={iconBtn}
                  aria-label="Account menu"
                  onClick={() => {
                    setAccountOpen((v) => !v)
                    setNotifOpen(false)
                  }}
                >
                  <User size={19} strokeWidth={1.8} />
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.22 }}
                      className="absolute right-0 mt-3 w-60 overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-lift"
                    >
                      <div className="border-b border-ink/6 px-4 py-3.5">
                        <p className="text-sm font-semibold text-ink">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-[12.5px] text-warm">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {[
                          { to: '/account', label: 'My Account', icon: User },
                          { to: '/account/orders', label: 'Orders', icon: ShoppingBag },
                          { to: '/account/favorites', label: 'Favorites', icon: Heart },
                          ...(user.role === 'admin'
                            ? [{ to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }]
                            : []),
                        ].map((i) => (
                          <Link
                            key={i.to}
                            to={i.to}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-ink-600 transition hover:bg-beige hover:text-ink"
                          >
                            <i.icon size={15} strokeWidth={1.8} />
                            {i.label}
                          </Link>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            logout()
                            setAccountOpen(false)
                            navigate('/')
                          }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-danger transition hover:bg-danger-soft"
                        >
                          <LogOut size={15} strokeWidth={1.8} /> Log out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className={`${iconBtn} hidden sm:grid`}
                aria-label="Log in"
              >
                <LogIn size={19} strokeWidth={1.8} />
              </Link>
            )}

            <button
              type="button"
              onClick={openCart}
              className={iconBtn}
              aria-label={`Open cart, ${totals.count} items`}
            >
              <ShoppingBag size={19} strokeWidth={1.8} />
              <AnimatePresence>
                {totals.count > 0 && (
                  <motion.span
                    key={totals.count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white ring-2 ring-cream/80"
                  >
                    {totals.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <span className="ml-1.5 hidden md:inline-flex">
              <Button
                size="sm"
                variant={solid ? 'primary' : 'light'}
                onClick={() => navigate('/menu')}
              >
                Order Now
              </Button>
            </span>

            <button
              type="button"
              className={`${iconBtn} ml-0.5 lg:hidden`}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <MenuIcon size={21} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      {/* ——— Mobile drawer ——— */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[96] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-[86vw] max-w-sm flex-col bg-cream shadow-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-beige"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Mobile">
                <ul className="space-y-1">
                  {NAV_LINKS.map((l, i) => (
                    <motion.li
                      key={l.to}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <NavLink
                        to={l.to}
                        end={l.to === '/'}
                        className={({ isActive }) =>
                          `flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-[22px] font-medium transition ${
                            isActive ? 'bg-clay-soft text-clay-dark' : 'text-ink hover:bg-beige'
                          }`
                        }
                      >
                        {l.label}
                        <ChevronRight size={18} className="text-warm" />
                      </NavLink>
                    </motion.li>
                  ))}
                  <motion.li
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.33, duration: 0.4 }}
                  >
                    <NavLink
                      to="/reservations"
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-[22px] font-medium transition ${
                          isActive ? 'bg-clay-soft text-clay-dark' : 'text-ink hover:bg-beige'
                        }`
                      }
                    >
                      Reservations
                      <ChevronRight size={18} className="text-warm" />
                    </NavLink>
                  </motion.li>
                </ul>

                <div className="mt-8 rounded-2xl bg-beige p-5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-olive uppercase">
                    <Clock3 size={13} /> Open Today
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-ink">{settings.openToday || restaurant.openToday}</p>
                  <p className="mt-1 text-[13px] text-warm">
                    {settings.city || restaurant.city} · ★ {stats.rating || restaurant.rating}
                  </p>
                </div>
              </nav>

              <div className="space-y-3 border-t border-ink/8 px-5 py-5">
                {user ? (
                  <>
                    <Link
                      to="/account"
                      className="flex items-center justify-between rounded-xl px-1 py-1 text-sm font-medium text-ink"
                    >
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-clay">My Account →</span>
                    </Link>
                    <Button variant="outline" className="w-full" onClick={() => { logout(); setMobileOpen(false) }}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                      Login
                    </Button>
                    <Button className="flex-1" onClick={() => navigate('/register')}>
                      Sign Up
                    </Button>
                  </div>
                )}
                <Button size="lg" className="w-full" onClick={() => { setMobileOpen(false); navigate('/menu') }}>
                  Order Now
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

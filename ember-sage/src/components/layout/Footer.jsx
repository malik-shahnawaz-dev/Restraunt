import { Link } from 'react-router-dom'
import { Instagram, Facebook, Youtube, Music2, ArrowRight, MapPin, Phone, Mail } from 'lucide-react'
import { useState } from 'react'
import Logo from './Logo.jsx'
import Button from '../ui/Button.jsx'
import { restaurant } from '../../data/menu.js'
import { useToast } from '../../context/ToastContext.jsx'

const COLUMNS = [
  {
    title: 'Restaurant',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Menu', to: '/menu' },
      { label: 'Reservations', to: '/reservations' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Customer',
    links: [
      { label: 'My Account', to: '/account' },
      { label: 'Orders', to: '/account/orders' },
      { label: 'Favorites', to: '/account/favorites' },
      { label: 'Delivery Information', to: '/contact' },
      { label: 'Track Order', to: '/track/10256' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/contact' },
      { label: 'Terms & Conditions', to: '/contact' },
      { label: 'Refund Policy', to: '/contact' },
    ],
  },
]

const SOCIALS = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Music2, label: 'TikTok', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const toast = useToast()

  const subscribe = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email', 'We need a valid address to send delicious updates.')
      return
    }
    toast.success('You’re subscribed!', 'Fresh menus and offers are headed your way.')
    setEmail('')
  }

  return (
    <footer className="relative overflow-hidden bg-ink text-cream">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden
        style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #C0522F 0, transparent 40%), radial-gradient(circle at 80% 70%, #5F6F45 0, transparent 45%)' }}
      />
      <div className="relative mx-auto max-w-[1440px] px-5 lg:px-10">
        {/* Newsletter band */}
        <div className="grid items-center gap-8 border-b border-cream/10 py-12 lg:grid-cols-2 lg:py-14">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-clay uppercase">Newsletter</p>
            <h3 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-medium">
              Get delicious updates
            </h3>
            <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-cream/55">
              Seasonal menus, chef’s specials and members-only offers — no spam, just flavor.
            </p>
          </div>
          <form onSubmit={subscribe} className="flex w-full flex-col gap-3 sm:flex-row" noValidate>
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="h-13 min-w-0 flex-1 rounded-full border border-cream/15 bg-cream/5 px-6 py-4 text-[15px] text-cream placeholder:text-cream/40 outline-none transition focus:border-clay focus:bg-cream/10"
            />
            <Button type="submit" size="lg" variant="primary" className="sm:w-auto">
              Subscribe <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        {/* Main columns */}
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo light />
            <p className="mt-5 max-w-sm text-[14.5px] leading-relaxed text-cream/55">
              {restaurant.description} A modern kitchen in the heart of {restaurant.city}, open late for
              dine-in, pickup and delivery.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-cream/15 text-cream/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-clay hover:bg-clay hover:text-white"
                >
                  <s.icon size={17} strokeWidth={1.7} />
                </a>
              ))}
            </div>
            <ul className="mt-7 space-y-2.5 text-[13.5px] text-cream/55">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-clay" /> {restaurant.address}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="shrink-0 text-clay" /> {restaurant.phone}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="shrink-0 text-clay" /> {restaurant.email}
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} className="lg:col-span-2" aria-label={col.title}>
              <h4 className="text-[11px] font-semibold tracking-[0.2em] text-cream/40 uppercase">{col.title}</h4>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label + l.to}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-1.5 text-[14px] text-cream/65 transition-colors hover:text-cream"
                    >
                      <span className="h-px w-0 bg-clay transition-all duration-300 group-hover:w-3" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold tracking-[0.2em] text-cream/40 uppercase">Hours</h4>
            <ul className="mt-5 space-y-3.5">
              {restaurant.hours.map((h) => (
                <li key={h.days} className="text-[13.5px]">
                  <p className="font-medium text-cream/85">{h.days}</p>
                  <p className="text-cream/50">{h.time}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-cream/10 py-7 sm:flex-row">
          <p className="text-[13px] text-cream/45">© 2026 Ember &amp; Sage. All rights reserved.</p>
          <p className="text-[12px] text-cream/35">
            Crafted for MERN implementation · React · Express · MongoDB
          </p>
        </div>
      </div>
    </footer>
  )
}

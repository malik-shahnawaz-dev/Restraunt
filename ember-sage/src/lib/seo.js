import { useEffect } from 'react'

/**
 * Per-route document metadata.
 *
 * The storefront is a single-page app, so without this every route would share
 * the title baked into index.html. Each route gets a proper <title> plus a
 * meta description (used by search results and link previews), and dish pages
 * override the title with the dish name.
 */
const SITE = 'Ember & Sage'

const ROUTES = [
  { match: /^\/$/, title: 'Good Food. Good Mood.', description: 'Wood-fired kitchen in F-7 Markaz, Islamabad. Order online, reserve a table or browse the seasonal menu.' },
  { match: /^\/menu\/[^/]+$/, title: 'Dish', description: 'Full dish details, customisations, allergens and reviews.' },
  { match: /^\/menu$/, title: 'Menu', description: 'Starters, mains, pizza, pasta, seafood, desserts and drinks — filter by category or search the whole menu.' },
  { match: /^\/about$/, title: 'Our Story', description: 'The people, the open flame and the philosophy behind Ember & Sage.' },
  { match: /^\/gallery$/, title: 'Gallery', description: 'Scenes from the house: the kitchen, the plates and the room.' },
  { match: /^\/contact$/, title: 'Contact', description: 'Find us in F-7 Markaz, Islamabad — call, email or send us a message.' },
  { match: /^\/reservations$/, title: 'Reserve a Table', description: 'Book your table at Ember & Sage — instant requests, human confirmation.' },
  { match: /^\/cart$/, title: 'Your Cart', description: 'Review your order before checkout.' },
  { match: /^\/checkout$/, title: 'Checkout', description: 'Secure checkout — delivery or pickup, card or cash on delivery.' },
  { match: /^\/order-confirmed/, title: 'Order Confirmed', description: 'Your order is in — we are firing up the kitchen.' },
  { match: /^\/track\//, title: 'Track Order', description: 'Live status and ETA for your order.' },
  { match: /^\/login$/, title: 'Sign In', description: 'Sign in to track orders, save favorites and check out faster.' },
  { match: /^\/register$/, title: 'Create Account', description: 'Join Ember & Sage for faster checkout, saved addresses and rewards.' },
  { match: /^\/forgot-password$/, title: 'Reset Password', description: 'We will email you a link to choose a new password.' },
  { match: /^\/reset-password$/, title: 'Choose a New Password', description: 'Set a new password for your Ember & Sage account.' },
  { match: /^\/account\/orders$/, title: 'My Orders', description: 'Your order history with live tracking, reorder and reviews.' },
  { match: /^\/account\/reservations$/, title: 'My Reservations', description: 'Table requests linked to your account.' },
  { match: /^\/account\/favorites$/, title: 'Favorites', description: 'Dishes you saved to your account.' },
  { match: /^\/account\/addresses$/, title: 'Saved Addresses', description: 'Delivery addresses saved to your account.' },
  { match: /^\/account\/payments$/, title: 'Payment Methods', description: 'Cards saved for faster checkout.' },
  { match: /^\/account\/notifications$/, title: 'Notifications', description: 'Order updates, receipts and offers.' },
  { match: /^\/account\/settings$/, title: 'Account Settings', description: 'Preferences, password and account controls.' },
  { match: /^\/account\/profile$/, title: 'My Profile', description: 'Your Ember & Sage account details.' },
  { match: /^\/account$/, title: 'My Account', description: 'Overview of your orders, rewards, favorites and reservations.' },
  { match: /^\/admin$/, title: 'Dashboard', description: 'Restaurant operations dashboard.', admin: true },
  { match: /^\/admin\/orders$/, title: 'Orders', description: 'Every order with live status controls.', admin: true },
  { match: /^\/admin\/menu$/, title: 'Menu Manager', description: 'Add and edit dishes, prices and availability.', admin: true },
  { match: /^\/admin\/categories$/, title: 'Categories', description: 'Organise the menu into browsable sections.', admin: true },
  { match: /^\/admin\/customers$/, title: 'Customers', description: 'Guest profiles, spend and loyalty.', admin: true },
  { match: /^\/admin\/reservations$/, title: 'Reservations', description: 'Confirm, seat or cancel table requests.', admin: true },
  { match: /^\/admin\/reviews$/, title: 'Reviews', description: 'Publish, feature or reply to guest reviews.', admin: true },
  { match: /^\/admin\/coupons$/, title: 'Coupons', description: 'Discount codes and their usage.', admin: true },
  { match: /^\/admin\/content$/, title: 'Site Content', description: 'Edit every headline, image and stat on the storefront.', admin: true },
  { match: /^\/admin\/gallery$/, title: 'Gallery', description: 'Photos shown on the home page and gallery page.', admin: true },
  { match: /^\/admin\/faqs$/, title: 'FAQs', description: 'Answers shown on the contact page.', admin: true },
  { match: /^\/admin\/media$/, title: 'Media Library', description: 'Images used across the menu, gallery and content blocks.', admin: true },
  { match: /^\/admin\/subscribers$/, title: 'Newsletter', description: 'Newsletter subscribers.', admin: true },
  { match: /^\/admin\/messages$/, title: 'Inbox', description: 'Enquiries from the contact form.', admin: true },
  { match: /^\/admin\/activity$/, title: 'Activity Log', description: 'Every change made from the admin panel.', admin: true },
  { match: /^\/admin\/analytics$/, title: 'Analytics', description: 'Revenue, orders, peak hours and top dishes.', admin: true },
  { match: /^\/admin\/settings$/, title: 'Settings', description: 'Restaurant profile, fees and operations.', admin: true },
  { match: /./, title: 'Page Not Found', description: 'That page has moved or never existed.' },
]

/** Resolve the metadata for a pathname — first matching route wins. */
export function metaFor(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '') || '/'
  const route = ROUTES.find((r) => r.match.test(path)) || ROUTES[ROUTES.length - 1]
  const label = route.admin ? `Admin · ${route.title}` : route.title
  return { title: `${label} · ${SITE}`, description: route.description, raw: route.title }
}

/** Hook form: call inside a page to override the resolved route metadata. */
export function usePageMeta(override) {
  const title = override?.title
  const description = override?.description
  useEffect(() => {
    if (title) document.title = title.includes(SITE) ? title : `${title} · ${SITE}`
    if (!description) return
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', description)
  }, [title, description])
}

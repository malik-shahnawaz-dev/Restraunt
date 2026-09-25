import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, Link } from 'react-router-dom'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import CartDrawer from './components/layout/CartDrawer.jsx'
import SearchOverlay from './components/layout/SearchOverlay.jsx'
import Button from './components/ui/Button.jsx'
import { EmptyState } from './components/ui/Motion.jsx'

import Home from './pages/Home.jsx'
import MenuPage from './pages/MenuPage.jsx'
import FoodDetailPage from './pages/FoodDetailPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrderConfirmedPage from './pages/OrderConfirmedPage.jsx'
import OrderTrackingPage from './pages/OrderTrackingPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import ContactPage, { ReservationsPage } from './pages/ContactPage.jsx'
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth/AuthPages.jsx'
import {
  AccountShell,
  ProfileSection,
  OrdersSection,
  FavoritesSection,
  AddressesSection,
  PaymentsSection,
  SettingsSection,
  OverviewSection,
  ReservationsSection,
  NotificationsSection,
} from './pages/AccountPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import {
  AdminDashboard,
  AdminOrders,
  AdminMenu,
  AdminCustomers,
  AdminCategories,
  AdminReservations,
  AdminReviews,
  AdminCoupons,
  AdminAnalytics,
  AdminSettings,
} from './pages/admin/AdminPages.jsx'
import {
  AdminContent,
  AdminGallery,
  AdminFaqs,
  AdminSubscribers,
  AdminMedia,
  AdminMessages,
  AdminActivity,
} from './pages/admin/AdminCms.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { metaFor, usePageMeta } from './lib/seo.js'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import { PackageSearch } from 'lucide-react'

function ScrollToTop() {
  const { pathname } = useLocation()
  const meta = metaFor(pathname)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  // Keep the browser tab and link previews in step with the route.
  usePageMeta(meta)
  return null
}

function StorefrontLayout() {
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar onOpenSearch={() => setSearchOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated, booting } = useAuth()
  const location = useLocation()
  if (booting) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function RequireAdmin({ children }) {
  const { isAdmin, booting } = useAuth()
  const location = useLocation()
  if (booting) return null
  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: '/admin' }} replace />
  }
  return children
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-40">
      <div className="rounded-panel border border-ink/6 bg-white shadow-soft">
        <EmptyState
          icon={PackageSearch}
          title="Page not found"
          message="The page you’re looking for was moved, removed, or never existed."
          action={
            <div className="flex gap-3">
              <Link to="/">
                <Button>Go home</Button>
              </Link>
              <Link to="/menu">
                <Button variant="outline">Browse menu</Button>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        {/* ——— Auth (no chrome) ——— */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ——— Admin ——— */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="subscribers" element={<AdminSubscribers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* ——— Storefront ——— */}
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:id" element={<FoodDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
          <Route path="/track/:id" element={<OrderTrackingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />

          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountShell />
              </RequireAuth>
            }
          >
            <Route index element={<OverviewSection />} />
            <Route path="profile" element={<ProfileSection />} />
            <Route path="orders" element={<OrdersSection />} />
            <Route path="reservations" element={<ReservationsSection />} />
            <Route path="favorites" element={<FavoritesSection />} />
            <Route path="addresses" element={<AddressesSection />} />
            <Route path="payments" element={<PaymentsSection />} />
            <Route path="notifications" element={<NotificationsSection />} />
            <Route path="settings" element={<SettingsSection />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Eye, EyeOff, MailCheck } from 'lucide-react'
import Logo from '../../components/layout/Logo.jsx'
import Button from '../../components/ui/Button.jsx'
import { Checkbox, Input } from '../../components/ui/Input.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { api } from '../../lib/api.js'

function AuthShell({ children, quote }) {
  return (
    <div className="grid min-h-svh bg-cream lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo light />
          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-clay uppercase">Ember &amp; Sage</p>
            <blockquote className="mt-4 font-display text-[34px] leading-[1.15] font-medium text-cream">
              “{quote}”
            </blockquote>
            <p className="mt-4 text-[14px] text-cream/50">— The Ember &amp; Sage kitchen</p>
          </div>
          <p className="text-[12.5px] text-cream/40">© 2026 Ember &amp; Sage · Islamabad</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-16 xl:px-24">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const { login, isLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address'
    if (form.password.length < 4) errs.password = 'Password must be at least 4 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      const user = await login({ ...form, remember })
      toast.success(`Welcome back, ${user.firstName}!`, 'You are now signed in.')
      const from = location.state?.from || (user.role === 'admin' ? '/admin' : '/menu')
      navigate(from, { replace: true })
    } catch (err) {
      setErrors({ password: err.message })
      toast.error('Login failed', err.message)
    }
  }

  return (
    <AuthShell quote="Every great dish begins with a little ember.">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-[13.5px] text-warm transition hover:text-clay">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-display text-[34px] leading-tight font-medium tracking-[-0.02em]">Welcome back</h1>
        <p className="mt-2 text-[14.5px] text-warm">Sign in to reorder favorites and track deliveries.</p>

        <Button variant="outline" className="mt-7 w-full" type="button" onClick={() => toast.info('Google sign-in', 'Social auth will connect via the MERN backend.')}
          aria-label="Continue with Google">
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-ink/10" />
          <span className="text-[12px] font-medium tracking-wide text-warm uppercase">or with email</span>
          <span className="h-px flex-1 bg-ink/10" />
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <div className="relative">
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute top-[38px] right-4 cursor-pointer text-warm transition hover:text-ink"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              label="Remember me"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <Link to="/forgot-password" className="text-[13.5px] font-medium text-clay hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="lg" loading={isLoading} className="w-full">
            {isLoading ? 'Signing in…' : 'Login'}
          </Button>
        </form>

        <p className="mt-7 text-center text-[14.5px] text-warm">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-clay hover:underline">
            Create one
          </Link>
        </p>
        <p className="mt-3 rounded-xl bg-beige px-4 py-2.5 text-center text-[12.5px] text-warm">
          Demo: any email + password works · use <strong>admin@…</strong> for the admin dashboard
        </p>
      </motion.div>
    </AuthShell>
  )
}

export function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    agree: false,
  })
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const { register, isLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!/^[+\d][\d\s-]{7,}$/.test(form.phone)) errs.phone = 'Enter a valid phone number'
    if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (!form.agree) errs.agree = 'Please accept the terms to continue'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await register(form)
      toast.success('Account created', `Welcome to Ember & Sage, ${form.firstName}!`)
      navigate('/menu')
    } catch (err) {
      toast.error('Registration failed', err.message)
    }
  }

  return (
    <AuthShell quote="Crafted with patience, served with pride.">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-[13.5px] text-warm transition hover:text-clay">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <h1 className="font-display text-[34px] leading-tight font-medium tracking-[-0.02em]">Create your account</h1>
        <p className="mt-2 text-[14.5px] text-warm">Join for faster checkout, order tracking and member perks.</p>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name" required placeholder="Ayesha" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
            <Input label="Last Name" required placeholder="Khan" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
          </div>
          <Input label="Email" type="email" required placeholder="you@email.com" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <Input label="Phone Number" type="tel" required placeholder="+92 300 1234567" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
          <div className="relative">
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              required
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute top-[38px] right-4 cursor-pointer text-warm transition hover:text-ink"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <Input
            label="Confirm Password"
            type={show ? 'text' : 'password'}
            required
            placeholder="Repeat password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            autoComplete="new-password"
          />

          <div className="pt-1">
            <Checkbox
              label={
                <>
                  I agree to the{' '}
                  <span className="font-medium text-clay underline decoration-clay/40 underline-offset-2">
                    Terms &amp; Conditions
                  </span>{' '}
                  and{' '}
                  <span className="font-medium text-clay underline decoration-clay/40 underline-offset-2">
                    Privacy Policy
                  </span>
                </>
              }
              checked={form.agree}
              onChange={set('agree')}
            />
            {errors.agree && <p className="mt-2 text-[13px] font-medium text-danger">{errors.agree}</p>}
          </div>

          <Button type="submit" size="lg" loading={isLoading} className="w-full">
            {isLoading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-7 text-center text-[14.5px] text-warm">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-clay hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
    toast.success('Reset link sent', 'Check your inbox for password reset instructions.')
  }

  return (
    <AuthShell quote="Take care of the ingredients and the dish takes care of itself.">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-[13.5px] text-warm transition hover:text-clay">
          <ArrowLeft size={14} /> Back to login
        </Link>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
                <MailCheck size={26} strokeWidth={1.7} />
              </div>
              <h1 className="mt-5 font-display text-[30px] leading-tight font-medium">Check your inbox</h1>
              <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-warm">
                We&apos;ve sent password reset instructions to <strong className="text-ink">{email}</strong>. The link
                expires in 30 minutes.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <Button size="lg" onClick={() => window.location.reload()}>
                  Open email app
                </Button>
                <Button variant="ghost" onClick={() => setSent(false)}>
                  Use a different email
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} noValidate>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-clay-soft text-clay" aria-hidden>
                <Check size={20} />
              </span>
              <h1 className="mt-5 font-display text-[32px] leading-tight font-medium tracking-[-0.02em]">Forgot password?</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-warm">
                No worries — enter the email associated with your account and we&apos;ll send a reset link.
              </p>
              <div className="mt-7">
                <Input
                  label="Email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" size="lg" loading={loading} className="mt-5 w-full">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = new URLSearchParams(window.location.search) ? [new URLSearchParams(window.location.search)] : []
  const token = searchParams?.get('token') || ''

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setError('')
    setLoading(true)
    try {
      const d = await api.post('/auth/reset', { token, password })
      setDone(true)
      toast.success('Password updated', d.message)
    } catch (err) {
      setError(err.message)
      toast.error('Reset failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell quote="Take care of the ingredients and the dish takes care of itself.">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <Link to="/login" className="mb-8 inline-flex items-center gap-1.5 text-[13.5px] text-warm transition hover:text-clay">
          <ArrowLeft size={14} /> Back to login
        </Link>
        {done ? (
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
              <Check size={26} />
            </div>
            <h1 className="mt-5 font-display text-[30px] leading-tight font-medium">Password changed</h1>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] text-warm">You can now sign in with your new password.</p>
            <Button size="lg" className="mt-6 w-full" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-clay-soft text-clay" aria-hidden>
              <Eye size={20} />
            </span>
            <h1 className="mt-5 font-display text-[32px] leading-tight font-medium tracking-[-0.02em]">Set a new password</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-warm">
              Choose a strong password of at least 8 characters.
              {!token && (
                <span className="mt-2 block rounded-lg bg-warning-soft px-3 py-2 text-[13px] font-medium text-warning">
                  Missing reset token — request a new link from the forgot-password page.
                </span>
              )}
            </p>
            <div className="mt-7 space-y-4">
              <Input label="New Password" type="password" required placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={error} autoComplete="new-password" />
              <Input label="Confirm Password" type="password" required placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" size="lg" loading={loading} disabled={!token} className="mt-5 w-full">
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </form>
        )}
      </motion.div>
    </AuthShell>
  )
}

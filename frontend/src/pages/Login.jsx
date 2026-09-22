import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'

const HIGHLIGHTS = [
  { icon: ShieldCheck, text: 'Real-time security scanning & anomaly detection' },
  { icon: Sparkles, text: 'AI-style cost optimization recommendations' },
  { icon: Cloud, text: 'Live simulated AWS environment - no credentials needed' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login, demoLogin } = useAuth()
  const [email, setEmail] = useState('demo@cloudguard.io')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy('login')
    try {
      await login(email, password, remember)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'))
    } finally {
      setBusy('')
    }
  }

  const useDemo = async () => {
    setError('')
    setBusy('demo')
    try {
      await demoLogin()
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Demo login is unavailable right now.'))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="scene-layer" aria-hidden="true" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:gap-16">
        {/* brand panel */}
        <div className="hidden max-w-sm flex-1 animate-fade-in lg:block">
          <Logo size={52} />
          <h1 className="h-display mt-8 text-4xl font-semibold leading-tight">Cloud security you can actually see.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">Monitor resources, catch security risks, control cost, and spot anomalies - all from one premium dashboard.</p>
          <div className="mt-9 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/7 text-accent"><Icon size={18} /></div>
                <p className="text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* login card */}
        <div className="glass w-full max-w-md animate-scale-in p-7 sm:p-9">
          <div className="mb-7 flex justify-center lg:hidden"><Logo size={42} /></div>
          <h2 className="h-display text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Sign in to your CloudGuard workspace.</p>

          {error && <div className="mt-4 rounded-2xl border border-danger/35 bg-danger/12 px-4 py-3 text-sm text-danger">{error}</div>}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="email">Email</label>
              <div className="relative">
                <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input !pl-10" placeholder="you@company.com" autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input !pl-10 !pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-muted">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[rgb(var(--accent))]" />
                Remember me
              </label>
              <button type="button" className="text-accent hover:underline" onClick={() => setError('Password reset is not available in this demo environment.')}>Forgot password?</button>
            </div>
            <button type="submit" disabled={!!busy} className="btn btn-primary w-full">{busy === 'login' ? 'Signing in...' : 'Log In'}</button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-white/12" />or<span className="h-px flex-1 bg-white/12" /></div>

          <button onClick={useDemo} disabled={!!busy} className="btn btn-ghost w-full">
            <Cloud size={16} /> {busy === 'demo' ? 'Signing in...' : 'Continue with Demo Account'}
          </button>
          <p className="mt-4 text-center text-xs text-muted">Demo login: demo@cloudguard.io · Demo@1234</p>
        </div>
      </div>
    </div>
  )
}

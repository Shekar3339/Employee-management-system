import { useState } from 'react'
import { BriefcaseBusiness, Eye, EyeOff, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context.js'
import './auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function destinationFor(role) {
  return role === 'ADMIN' ? '/dashboard' : '/profile'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!normalizedEmail || !password) {
      setError('Enter your email address and password.')
      return
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const user = await login(normalizedEmail, password)
      navigate(destinationFor(user.role), { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <BriefcaseBusiness aria-hidden="true" size={32} />
          <span>EmployeeHub</span>
        </div>
        <div>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to access your EmployeeHub workspace.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <p className="auth-error" role="alert">{error}</p>}

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            disabled={submitting}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="auth-password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={submitting}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={submitting}>
            <LogIn aria-hidden="true" size={18} />
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

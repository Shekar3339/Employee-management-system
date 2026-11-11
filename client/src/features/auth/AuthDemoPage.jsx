import { BriefcaseBusiness, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context.js'
import './auth.css'

export function AuthDemoPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-success-card" aria-labelledby="auth-success-title">
        <div className="auth-brand">
          <BriefcaseBusiness aria-hidden="true" size={32} />
          <span>EmployeeHub</span>
        </div>
        <div>
          <h1 id="auth-success-title">Authentication successful</h1>
          <p>You are signed in. This page verifies your account and role.</p>
        </div>
        <dl className="auth-identity">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
        <button className="auth-submit" type="button" onClick={handleLogout}>
          <LogOut aria-hidden="true" size={18} />
          Sign out
        </button>
      </section>
    </main>
  )
}

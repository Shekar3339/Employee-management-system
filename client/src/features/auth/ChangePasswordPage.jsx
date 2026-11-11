import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context.js'
import './auth.css'

export function ChangePasswordPage() {
  const { changePassword } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (newPassword.length < 8) return setError('New password must be at least 8 characters long.')
    if (newPassword !== confirmPassword) return setError('New passwords do not match.')
    setError('')
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to change password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="change-password-title">
        <div className="auth-brand"><KeyRound aria-hidden="true" size={32} /><span>EmployeeHub</span></div>
        <div><h1 id="change-password-title">Set a new password</h1><p>For your security, change the temporary password before continuing.</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <label htmlFor="current-password">Temporary or current password</label>
          <input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={submitting} autoComplete="current-password" required />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={submitting} autoComplete="new-password" required />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={submitting} autoComplete="new-password" required />
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Change password'}</button>
        </form>
      </section>
    </main>
  )
}

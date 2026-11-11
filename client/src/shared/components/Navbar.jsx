import { useState } from 'react'
import { LogOut } from 'lucide-react'

function Navbar({ user, onLogout }) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleLogout() {
    setIsSigningOut(true)
    await onLogout()
  }

  return (
    <header className="navbar">
      <span>{user.name}</span>
      <span className="role-badge">{user.role}</span>
      <button
        aria-label="Sign out"
        className="app-sign-out"
        disabled={isSigningOut}
        onClick={handleLogout}
        type="button"
      >
        <LogOut aria-hidden="true" size={16} />
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </header>
  )
}

export default Navbar

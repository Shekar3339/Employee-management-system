import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context.js'
import './auth.css'

function destinationFor(role) {
  return role === 'ADMIN' ? '/admin/dashboard' : '/employee/profile'
}

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="auth-route-status" role="status">Checking your session…</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const destination = destinationFor(user.role)

    if (destination === location.pathname) {
      return <p className="auth-route-status" role="alert">You are not authorized to view this page.</p>
    }

    return <Navigate to={destination} replace />
  }

  return children
}

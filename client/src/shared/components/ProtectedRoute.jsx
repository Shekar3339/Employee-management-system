import { Navigate, Outlet, useLocation } from 'react-router-dom'

function ProtectedRoute({ user, allowedRoles }) {
  const location = useLocation()

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to="/profile" />
  }

  return <Outlet />
}

export default ProtectedRoute

import { BriefcaseBusiness, LogOut } from 'lucide-react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { EmployeesPage } from '../features/employees/index.js'
import { LoginPage, ProtectedRoute, useAuth } from '../features/auth/index.js'
import DepartmentManagement from '../features/departments/index.js'
import LeaveManagement from '../features/leaves/LeaveManagement.jsx'
import './App.css'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <Navigate
      to={user.role === 'ADMIN' ? '/admin/dashboard' : '/employee/profile'}
      replace
    />
  )
}

function SignOutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <button className="app-sign-out" type="button" onClick={signOut}>
      <LogOut aria-hidden="true" size={16} />
      Sign out
    </button>
  )
}

function AdminDashboard() {
  const { user } = useAuth()

  return (
    <main className="app-shell">
      <BriefcaseBusiness aria-hidden="true" size={40} />
      <h1>Admin dashboard</h1>
      <p>Welcome, {user.name}</p>
      <span>{user.email}</span>
      <Link to="/employees">Manage employees</Link>
      <Link to="/departments">Manage departments</Link>
      <SignOutButton />
    </main>
  )
}

function DepartmentManagementRoute() {
  const { user } = useAuth()
  return <DepartmentManagement canManage={user.role === 'ADMIN'} />
}

function EmployeeProfile() {
  const { user } = useAuth()

  return (
    <>
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">EMPLOYEE PROFILE</p>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <LeaveManagement />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin/dashboard"
        element={(
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/employees"
        element={(
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <EmployeesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/departments"
        element={(
          <ProtectedRoute allowedRoles={['ADMIN', 'EMPLOYEE']}>
            <DepartmentManagementRoute />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/employee/profile"
        element={(
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <EmployeeProfile />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

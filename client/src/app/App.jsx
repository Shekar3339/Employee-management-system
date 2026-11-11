import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from '../features/dashboard/index.js'
import {
  LoginPage,
  ProtectedRoute,
  useAuth,
} from '../features/auth/index.js'
import DepartmentManagement from '../features/departments/index.js'
import { EmployeesPage } from '../features/employees/index.js'
import LeaveManagement from '../features/leaves/LeaveManagement.jsx'
import AppLayout from './AppLayout.jsx'
import './App.css'
import PlaceholderPage from './PlaceholderPage.jsx'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) return <Navigate replace to="/login" />

  return <Navigate replace to={user.role === 'ADMIN' ? '/dashboard' : '/profile'} />
}

function AuthenticatedLayout() {
  const { user } = useAuth()
  return <AppLayout user={user} />
}

function DashboardRoute() {
  const { user } = useAuth()
  return <DashboardPage user={user} />
}

function DepartmentManagementRoute() {
  const { user } = useAuth()
  return <DepartmentManagement canManage={user.role === 'ADMIN'} />
}

function ProfilePage() {
  const { user } = useAuth()

  return (
    <PlaceholderPage
      description={`Signed in as ${user.email}. Your profile feature is awaiting its module owner.`}
      title={user.name}
    />
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        )}
      >
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DashboardRoute />
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
          path="/leaves"
          element={(
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <LeaveManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <ProfilePage />
            </ProtectedRoute>
          )}
        />
      </Route>
      <Route
        path="*"
        element={(
          <PlaceholderPage
            description="The page you requested does not exist."
            title="Page not found"
          />
        )}
      />
    </Routes>
  )
}

export default App

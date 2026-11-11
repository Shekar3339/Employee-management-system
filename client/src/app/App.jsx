import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from '../features/dashboard/index.js'
import {
  LoginPage,
  ChangePasswordPage,
  ProtectedRoute,
  useAuth,
} from '../features/auth/index.js'
import DepartmentManagement from '../features/departments/index.js'
import { EmployeesPage } from '../features/employees/index.js'
import LeaveManagement from '../features/leaves/LeaveManagement.jsx'
import AppLayout from './AppLayout.jsx'
import './App.css'
import PlaceholderPage from './PlaceholderPage.jsx'
import EmployeeProfilePage from '../features/employees/EmployeeProfilePage.jsx'

function HomeRedirect() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate replace to="/login" />

  return <Navigate replace to="/dashboard" />
}

function AuthenticatedLayout() {
  const { user, logout } = useAuth()
  return <AppLayout user={user} onLogout={logout} />
}

function DashboardRoute() {
  const { user } = useAuth()
  return <DashboardPage user={user} />
}

function DepartmentManagementRoute() {
  const { user } = useAuth()
  return <DepartmentManagement canManage={user.role === 'ADMIN'} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
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
            <ProtectedRoute allowedRoles={['ADMIN', 'EMPLOYEE']}>
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
            <ProtectedRoute allowedRoles={['ADMIN', 'EMPLOYEE']}>
              <LeaveManagement />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <EmployeeProfilePage />
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

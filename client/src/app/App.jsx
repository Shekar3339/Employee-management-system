import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom'
import { DashboardPage } from '../features/dashboard/index.js'
import ProtectedRoute from '../shared/components/ProtectedRoute.jsx'
import AppLayout from './AppLayout.jsx'
import './App.css'
import PlaceholderPage from './PlaceholderPage.jsx'

// The Authentication module will supply this contract and its state provider.
// Keeping it null makes every protected route fail closed until then.
const currentUser = null

function DashboardRoute() {
  const { user } = useOutletContext()
  return <DashboardPage user={user} />
}

function LoginPlaceholder() {
  return (
    <main className="public-page">
      <h1>EmployeeHub</h1>
      <p>The Authentication module will provide the login experience.</p>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute user={currentUser} />}>
        <Route element={<AppLayout user={currentUser} />}>
          <Route
            element={<ProtectedRoute allowedRoles={['ADMIN']} user={currentUser} />}
          >
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route
              path="/employees"
              element={<PlaceholderPage description="Employee Management is awaiting its module owner." title="Employees" />}
            />
            <Route
              path="/departments"
              element={<PlaceholderPage description="Department Management is awaiting its module owner." title="Departments" />}
            />
          </Route>
          <Route
            path="/leaves"
            element={<PlaceholderPage description="Leave Management is awaiting its module owner." title="Leaves" />}
          />
          <Route
            path="/profile"
            element={<PlaceholderPage description="Profile integration is awaiting the Authentication module." title="Profile" />}
          />
        </Route>
      </Route>
      <Route path="/login" element={<LoginPlaceholder />} />
      <Route path="/" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<PlaceholderPage description="The page you requested does not exist." title="Page not found" />} />
    </Routes>
  )
}

export default App

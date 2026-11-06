import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ProtectedRoute, useAuth } from '../features/auth/index.js'
import DepartmentManagement from '../features/departments/index.js'

function DepartmentManagementRoute() {
  const { user } = useAuth()
  return <DepartmentManagement canManage={user?.role === 'ADMIN'} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/departments" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/departments"
        element={(
          <ProtectedRoute allowedRoles={['ADMIN', 'EMPLOYEE']}>
            <DepartmentManagementRoute />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/departments" replace />} />
    </Routes>
  )
}

export default App

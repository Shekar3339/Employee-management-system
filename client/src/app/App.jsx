import { Navigate, Route, Routes } from 'react-router-dom'
import { EmployeesPage } from '../features/employees/index.js'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/employees" replace />} />
      <Route path="/employees" element={<EmployeesPage />} />
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}

export default App

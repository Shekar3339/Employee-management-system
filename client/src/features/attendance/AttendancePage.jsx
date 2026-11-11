import { useAuth } from '../auth/auth-context.js'
import AdminAttendance from './AdminAttendance.jsx'
import EmployeeAttendance from './EmployeeAttendance.jsx'
import './attendance.css'

function AttendancePage() {
  const { user } = useAuth()
  return user.role === 'ADMIN' ? <AdminAttendance /> : <EmployeeAttendance />
}

export default AttendancePage

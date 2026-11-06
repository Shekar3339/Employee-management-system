import { Building2, CalendarDays, LayoutDashboard, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/leaves', label: 'Leave Management', icon: CalendarDays },
]

const employeeLinks = [
  { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { to: '/profile', label: 'My Profile', icon: Users },
  { to: '/leaves', label: 'My Leaves', icon: CalendarDays },
]

function Sidebar({ role }) {
  const links = role === 'ADMIN' ? adminLinks : employeeLinks

  return (
    <aside className="sidebar">
      <NavLink className="brand" to="/dashboard">EmployeeHub</NavLink>
      <nav aria-label="Primary navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} className="nav-link" to={to}>
            <Icon aria-hidden="true" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar

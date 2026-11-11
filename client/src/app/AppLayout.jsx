import { Outlet } from 'react-router-dom'
import Navbar from '../shared/components/Navbar.jsx'
import Sidebar from '../shared/components/Sidebar.jsx'

function AppLayout({ user, onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar role={user.role} />
      <div className="app-layout__content">
        <Navbar user={user} onLogout={onLogout} />
        <main className="app-layout__main">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  )
}

export default AppLayout

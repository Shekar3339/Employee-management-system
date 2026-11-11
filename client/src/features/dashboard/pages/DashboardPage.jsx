import { BadgeCheck, Building2, BriefcaseBusiness, CalendarDays, Clock3, Users, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../../../shared/components/ErrorMessage.jsx'
import Loading from '../../../shared/components/Loading.jsx'
import { getCurrentEmployeeProfile } from '../../employees/employeeApi.js'
import StatCard from '../components/StatCard.jsx'
import { getDashboardStatistics } from '../services/dashboardService.js'
import '../dashboard.css'

const adminDashboardCards = [
  { key: 'totalEmployees', label: 'Total Employees', icon: Users },
  { key: 'activeEmployees', label: 'Active Employees', icon: UserRoundCheck },
  { key: 'totalDepartments', label: 'Departments', icon: Building2 },
  { key: 'pendingLeaves', label: 'Pending Leave Requests', icon: Clock3 },
]

const employeeDashboardCards = [
  { key: 'designation', label: 'Designation', icon: BriefcaseBusiness },
  { key: 'department', label: 'Department', icon: Building2 },
  { key: 'status', label: 'Employment status', icon: BadgeCheck },
  { key: 'joiningDate', label: 'Joining date', icon: CalendarDays },
]

function getReadableError(error) {
  return (
    error.response?.data?.message ||
    'We could not load your dashboard. Check your connection and try again.'
  )
}

function DashboardPage({ user }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const isAdmin = user.role === 'ADMIN'

  useEffect(() => {
    let isCurrentRequest = true

    async function loadDashboard() {
      try {
        const result = isAdmin
          ? await getDashboardStatistics()
          : { data: await getCurrentEmployeeProfile() }
        if (isCurrentRequest) {
          setDashboardData(result.data)
          setError('')
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setDashboardData(null)
          setError(getReadableError(requestError))
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isCurrentRequest = false
    }
  }, [isAdmin, reloadKey])

  function retryLoad() {
    setIsLoading(true)
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="eyebrow">{isAdmin ? 'Administrator workspace' : 'Employee workspace'}</p>
          <h1>{isAdmin ? 'Dashboard' : 'My Dashboard'}</h1>
          <p className="dashboard-page__welcome">Welcome back, {user.name}.</p>
        </div>
      </header>

      {isLoading && <Loading label={isAdmin ? 'Loading dashboard statistics…' : 'Loading your dashboard…'} />}

      {!isLoading && error && (
        <ErrorMessage message={error} onRetry={retryLoad} />
      )}

      {!isLoading && !error && isAdmin && (
        <div className="stats-grid">
          {adminDashboardCards.map(({ key, label, icon }) => (
            <StatCard
              key={key}
              icon={icon}
              label={label}
              value={dashboardData?.[key]}
            />
          ))}
        </div>
      )}
      {!isLoading && !error && !isAdmin && dashboardData && (
        <>
          <div className="stats-grid">
            {employeeDashboardCards.map(({ key, label, icon }) => {
              const value = key === 'department'
                ? dashboardData.departmentId?.name
                : key === 'joiningDate' && dashboardData.joiningDate
                  ? new Date(dashboardData.joiningDate).toLocaleDateString()
                  : dashboardData[key]
              return <StatCard key={key} icon={icon} label={label} value={value || '—'} />
            })}
          </div>
          <nav className="dashboard-page__actions" aria-label="Employee shortcuts">
            <Link to="/profile">View my profile</Link>
            <Link to="/leaves">Manage my leave requests</Link>
          </nav>
        </>
      )}
    </section>
  )
}

export default DashboardPage

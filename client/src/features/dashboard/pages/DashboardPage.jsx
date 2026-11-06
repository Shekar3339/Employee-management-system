import { Building2, Clock3, Users, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import ErrorMessage from '../../../shared/components/ErrorMessage.jsx'
import Loading from '../../../shared/components/Loading.jsx'
import StatCard from '../components/StatCard.jsx'
import { getDashboardStatistics } from '../services/dashboardService.js'
import '../dashboard.css'

const dashboardCards = [
  { key: 'totalEmployees', label: 'Total Employees', icon: Users },
  { key: 'activeEmployees', label: 'Active Employees', icon: UserRoundCheck },
  { key: 'totalDepartments', label: 'Departments', icon: Building2 },
  { key: 'pendingLeaves', label: 'Pending Leave Requests', icon: Clock3 },
]

function getReadableError(error) {
  return (
    error.response?.data?.message ||
    'We could not load dashboard statistics. Check your connection and try again.'
  )
}

function DashboardPage({ user }) {
  const [statistics, setStatistics] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isCurrentRequest = true

    async function loadStatistics() {
      try {
        const result = await getDashboardStatistics()
        if (isCurrentRequest) {
          setStatistics(result.data)
          setError('')
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setStatistics(null)
          setError(getReadableError(requestError))
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoading(false)
        }
      }
    }

    loadStatistics()

    return () => {
      isCurrentRequest = false
    }
  }, [reloadKey])

  function retryLoad() {
    setIsLoading(true)
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <p className="eyebrow">Administrator workspace</p>
          <h1>Dashboard</h1>
          <p className="dashboard-page__welcome">Welcome back, {user.name}.</p>
        </div>
      </header>

      {isLoading && <Loading label="Loading dashboard statistics…" />}

      {!isLoading && error && (
        <ErrorMessage message={error} onRetry={retryLoad} />
      )}

      {!isLoading && !error && (
        <div className="stats-grid">
          {dashboardCards.map(({ key, label, icon }) => (
            <StatCard
              key={key}
              icon={icon}
              label={label}
              value={statistics?.[key]}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default DashboardPage

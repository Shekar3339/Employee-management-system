import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorMessage from '../../shared/components/ErrorMessage.jsx'
import Loading from '../../shared/components/Loading.jsx'
import { getCurrentEmployeeProfile } from './employeeApi.js'
import './employee-profile.css'

const profileFields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'joiningDate', label: 'Joining date' },
  { key: 'status', label: 'Status' },
]

function displayValue(profile, field) {
  if (field.key === 'department') return profile.departmentId?.name || 'Not provided'
  if (field.key === 'joiningDate') {
    return profile.joiningDate
      ? new Date(profile.joiningDate).toLocaleDateString()
      : 'Not provided'
  }
  if (field.key === 'status') return profile.status || 'Not provided'
  return profile[field.key] || 'Not provided'
}

function EmployeeProfilePage() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isCurrentRequest = true

    async function loadProfile() {
      try {
        const result = await getCurrentEmployeeProfile()
        if (isCurrentRequest) {
          setProfile(result)
          setError('')
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setProfile(null)
          setError(
            requestError.response?.status === 404
              ? ''
              : requestError.response?.data?.message || 'We could not load your profile. Check your connection and try again.',
          )
        }
      } finally {
        if (isCurrentRequest) setIsLoading(false)
      }
    }

    loadProfile()

    return () => {
      isCurrentRequest = false
    }
  }, [reloadKey])

  function retryLoad() {
    setIsLoading(true)
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="employee-profile">
      <header className="employee-profile__header">
        <div>
          <p className="employee-eyebrow">MY ACCOUNT</p>
          <h1>My profile</h1>
          <p>Your employment details are read-only. Contact an administrator to request changes.</p>
        </div>
        <Link className="employee-button employee-button--quiet" to="/change-password">
          <KeyRound aria-hidden="true" size={16} />
          Change password
        </Link>
      </header>

      {isLoading && <Loading label="Loading your profile…" />}
      {!isLoading && error && <ErrorMessage message={error} onRetry={retryLoad} />}
      {!isLoading && !error && !profile && (
        <div className="employee-profile__empty" role="status">
          <h2>Profile not available</h2>
          <p>Your employee profile could not be found. Contact an administrator for help.</p>
          <button className="employee-button employee-button--quiet" type="button" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}
      {!isLoading && !error && profile && (
        <dl className="employee-profile__details">
          {profileFields.map((field) => (
            <div className="employee-profile__field" key={field.key}>
              <dt>{field.label}</dt>
              <dd>
                {field.key === 'status' ? (
                  <span className={`employee-status employee-status--${profile.status?.toLowerCase() || 'unknown'}`}>
                    {displayValue(profile, field)}
                  </span>
                ) : displayValue(profile, field)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

export default EmployeeProfilePage

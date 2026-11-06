import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  Send,
  XCircle,
} from 'lucide-react'
import apiClient from '../../shared/api/client.js'
import './LeaveManagement.css'

const initialForm = {
  leaveType: 'Annual leave',
  startDate: '',
  endDate: '',
  reason: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getErrorMessage(error, fallback) {
  if (error.response?.status === 401) {
    return 'Sign in is required. The Authentication module must save your JWT as employeehub_token, then refresh this page.'
  }
  if (error.response?.status === 403) {
    return 'Your account does not have permission to use this action.'
  }
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.status === 404) {
    return 'Leave service endpoint not found. Check that the backend is running the latest code.'
  }
  if (error.response) {
    return `Leave service returned HTTP ${error.response.status}.`
  }
  if (error.request) {
    return 'Cannot reach the leave service. Check that the backend is running and configured.'
  }
  return error.message || fallback
}

function LeaveManagement() {
  const [leaves, setLeaves] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadLeaves() {
      try {
        const response = await apiClient.get('/leaves/mine')
        if (active) setLeaves(response.data.data)
      } catch (error) {
        if (active) {
          setErrorMessage(
            getErrorMessage(error, 'Could not load your leave requests.'),
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLeaves()
    return () => {
      active = false
    }
  }, [])

  const summary = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((leave) => leave.status === 'PENDING').length,
      approved: leaves.filter((leave) => leave.status === 'APPROVED').length,
    }),
    [leaves],
  )

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function submitRequest(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (form.endDate < form.startDate) {
      setErrorMessage('The end date must be on or after the start date.')
      return
    }

    setSubmitting(true)
    try {
      const response = await apiClient.post('/leaves', form)
      setLeaves((current) => [response.data.data, ...current])
      setForm(initialForm)
      setSuccessMessage('Your leave request has been submitted.')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not submit your leave request.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="leave-page">
      <header className="leave-header">
        <div className="leave-brand">
          <div className="leave-brand-icon">
            <CalendarDays aria-hidden="true" size={22} />
          </div>
          <div>
            <p className="leave-brand-name">EmployeeHub</p>
            <p className="leave-brand-caption">People operations</p>
          </div>
        </div>
        <span className="leave-header-label">Leave management</span>
      </header>

      <div className="leave-content">
        <section className="leave-intro">
          <div>
            <p className="leave-eyebrow">TIME AWAY</p>
            <h1>Leave management</h1>
            <p className="leave-intro-copy">
              Plan time away and keep track of your requests.
            </p>
          </div>
          <a className="leave-primary-link" href="#request-form">
            <Plus aria-hidden="true" size={18} />
            New request
          </a>
        </section>

        <section className="leave-summary" aria-label="Leave request summary">
          <article className="leave-summary-card">
            <span className="leave-summary-icon summary-blue">
              <CalendarDays aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="leave-summary-label">Total requests</p>
              <p className="leave-summary-value">{summary.total}</p>
            </div>
          </article>
          <article className="leave-summary-card">
            <span className="leave-summary-icon summary-amber">
              <Clock3 aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="leave-summary-label">Awaiting review</p>
              <p className="leave-summary-value">{summary.pending}</p>
            </div>
          </article>
          <article className="leave-summary-card">
            <span className="leave-summary-icon summary-green">
              <CheckCircle2 aria-hidden="true" size={19} />
            </span>
            <div>
              <p className="leave-summary-label">Approved</p>
              <p className="leave-summary-value">{summary.approved}</p>
            </div>
          </article>
        </section>

        {errorMessage && (
          <div className="leave-alert leave-alert-error" role="alert">
            <XCircle aria-hidden="true" size={18} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="leave-alert leave-alert-success" role="status">
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <section className="leave-panel" id="request-form">
          <div className="leave-panel-heading">
            <div className="leave-panel-title-icon">
              <Send aria-hidden="true" size={18} />
            </div>
            <div>
              <h2>Request time off</h2>
              <p>Share the details of your leave request.</p>
            </div>
          </div>
          <form className="leave-form" onSubmit={submitRequest}>
            <label>
              Leave type
              <select
                name="leaveType"
                value={form.leaveType}
                onChange={updateForm}
              >
                <option>Annual leave</option>
                <option>Sick leave</option>
                <option>Personal leave</option>
                <option>Unpaid leave</option>
              </select>
            </label>
            <label>
              Start date
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={updateForm}
                required
              />
            </label>
            <label>
              End date
              <input
                name="endDate"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={updateForm}
                required
              />
            </label>
            <label className="leave-reason-field">
              Reason
              <textarea
                name="reason"
                value={form.reason}
                onChange={updateForm}
                placeholder="Add a short note for your manager"
                rows="3"
                required
              />
            </label>
            <div className="leave-form-footer">
              <p>Your request will be sent to your manager for review.</p>
              <button type="submit" disabled={submitting}>
                <Send aria-hidden="true" size={16} />
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </form>
        </section>

        <section className="leave-panel leave-history">
          <div className="leave-history-heading">
            <div>
              <h2>My requests</h2>
              <p>Recent and past leave requests</p>
            </div>
            <span className="leave-count">{summary.total}</span>
          </div>
          {loading ? (
            <p className="leave-empty-state">Loading your requests…</p>
          ) : leaves.length === 0 ? (
            <div className="leave-empty-state">
              <CalendarDays aria-hidden="true" size={23} />
              <p>No leave requests yet</p>
              <span>Your requests will appear here after you submit one.</span>
            </div>
          ) : (
            <div className="leave-table-wrap">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th scope="col">Leave type</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td className="leave-type-cell">{leave.leaveType}</td>
                      <td>
                        {formatDate(leave.startDate)}
                        <span className="leave-date-separator"> to </span>
                        {formatDate(leave.endDate)}
                      </td>
                      <td className="leave-reason-cell">{leave.reason}</td>
                      <td>
                        <span
                          className={`leave-status status-${leave.status?.toLowerCase()}`}
                        >
                          {leave.status?.toLowerCase() || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default LeaveManagement

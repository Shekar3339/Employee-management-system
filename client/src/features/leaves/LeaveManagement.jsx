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
import { useAuth } from '../auth/auth-context.js'
import AdminLeaveManagement from './AdminLeaveManagement.jsx'
import { formatLeaveDate, getApiValidationMessage, getLeaveErrorMessage } from './leaveUtils.js'
import { normalizeLeaveForm, validateLeaveForm } from './leaveValidation.js'
import './LeaveManagement.css'

const initialForm = {
  leaveType: 'Annual leave',
  startDate: '',
  endDate: '',
  reason: '',
}

function EmployeeLeaveManagement() {
  const [leaves, setLeaves] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true

    async function loadLeaves() {
      try {
        const response = await apiClient.get('/leaves/mine')
        if (active) {
          setLeaves(response.data.data)
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(getLeaveErrorMessage(error, 'Could not load your leave requests.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLeaves()
    return () => {
      active = false
    }
  }, [reloadKey])

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
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((currentKey) => currentKey + 1)
  }

  async function submitRequest(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    const normalizedForm = normalizeLeaveForm(form)
    const validationErrors = validateLeaveForm(normalizedForm)

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage('Please correct the highlighted fields.')
      return
    }

    setSubmitting(true)
    setFieldErrors({})
    try {
      const response = await apiClient.post('/leaves', normalizedForm)
      setLeaves((current) => [response.data.data, ...current])
      setLoadError('')
      setForm(initialForm)
      setSuccessMessage('Your leave request has been submitted.')
    } catch (error) {
      setErrorMessage(getApiValidationMessage(error) || getLeaveErrorMessage(error, 'Could not submit your leave request.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="leave-page">
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
          <form className="leave-form" onSubmit={submitRequest} noValidate>
            <label>
              Leave type
              <select
                name="leaveType"
                value={form.leaveType}
                onChange={updateForm}
                aria-invalid={Boolean(fieldErrors.leaveType)}
                aria-describedby={fieldErrors.leaveType ? 'leave-type-error' : undefined}
              >
                <option>Annual leave</option>
                <option>Sick leave</option>
                <option>Personal leave</option>
                <option>Unpaid leave</option>
              </select>
              {fieldErrors.leaveType && <span id="leave-type-error" className="leave-field-error">{fieldErrors.leaveType}</span>}
            </label>
            <label>
              Start date
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={updateForm}
                aria-invalid={Boolean(fieldErrors.startDate)}
                aria-describedby={fieldErrors.startDate ? 'leave-start-date-error' : undefined}
                required
              />
              {fieldErrors.startDate && <span id="leave-start-date-error" className="leave-field-error">{fieldErrors.startDate}</span>}
            </label>
            <label>
              End date
              <input
                name="endDate"
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={updateForm}
                aria-invalid={Boolean(fieldErrors.endDate)}
                aria-describedby={fieldErrors.endDate ? 'leave-end-date-error' : undefined}
                required
              />
              {fieldErrors.endDate && <span id="leave-end-date-error" className="leave-field-error">{fieldErrors.endDate}</span>}
            </label>
            <label className="leave-reason-field">
              Reason
              <textarea
                name="reason"
                value={form.reason}
                onChange={updateForm}
                placeholder="Add a short note for your manager"
                rows="3"
                aria-invalid={Boolean(fieldErrors.reason)}
                aria-describedby={fieldErrors.reason ? 'leave-reason-error' : undefined}
                required
              />
              {fieldErrors.reason && <span id="leave-reason-error" className="leave-field-error">{fieldErrors.reason}</span>}
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
            <p className="leave-empty-state" role="status">Loading your requests…</p>
          ) : loadError ? (
            <div className="leave-empty-state" role="alert">
              <p>Could not load your requests</p>
              <span>{loadError}</span>
              <button className="leave-secondary-button" type="button" onClick={retryLoad}>Try again</button>
            </div>
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
                    <th scope="col">Review details</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id}>
                      <td className="leave-type-cell">{leave.leaveType}</td>
                      <td>
                        {formatLeaveDate(leave.startDate)}
                        <span className="leave-date-separator"> to </span>
                        {formatLeaveDate(leave.endDate)}
                      </td>
                      <td className="leave-reason-cell">{leave.reason}</td>
                      <td>
                        <span
                          className={`leave-status status-${leave.status?.toLowerCase()}`}
                        >
                          {leave.status?.toLowerCase() || 'unknown'}
                        </span>
                      </td>
                      <td className="leave-review-details">
                        {leave.reviewedBy?.name ? <span>{leave.reviewedBy.name}</span> : null}
                        {leave.reviewedAt
                          ? <span>{formatLeaveDate(leave.reviewedAt)}</span>
                          : <span>{leave.status === 'PENDING' ? 'Awaiting review' : 'Review date unavailable'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function LeaveManagement() {
  const { user } = useAuth()
  return user.role === 'ADMIN' ? <AdminLeaveManagement /> : <EmployeeLeaveManagement />
}

export default LeaveManagement

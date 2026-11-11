import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context.js'
import apiClient from '../../shared/api/client.js'
import { formatLeaveDate, getLeaveErrorMessage } from './leaveUtils.js'

function AdminLeaveManagement() {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [reviewingId, setReviewingId] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response = await apiClient.get('/leaves')
        if (active) {
          setLeaves(response.data.data)
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(getLeaveErrorMessage(error, 'Could not load leave requests.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [reloadKey])

  async function reviewRequest(leave, status) {
    const action = status === 'APPROVED' ? 'approve' : 'reject'
    const employeeName = leave.employeeId?.name || 'this employee'
    if (!window.confirm(`Are you sure you want to ${action} ${employeeName}'s ${leave.leaveType} request?`)) {
      return
    }

    setReviewingId(leave._id)
    setActionError('')
    setSuccessMessage('')
    try {
      const response = await apiClient.patch(`/leaves/${leave._id}/status`, { status })
      const reviewedLeave = response.data.data
      setLeaves((current) => current.map((item) => (
        item._id === leave._id
          ? {
            ...item,
            status: reviewedLeave.status,
            reviewedBy: { id: user.id, name: user.name, email: user.email },
            reviewedAt: reviewedLeave.reviewedAt,
          }
          : item
      )))
      setSuccessMessage(`Leave request ${status.toLowerCase()} successfully.`)
    } catch (error) {
      setActionError(getLeaveErrorMessage(error, `Could not ${action} this leave request.`))
    } finally {
      setReviewingId('')
    }
  }

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="leave-page">
      <div className="leave-content">
        <section className="leave-intro">
          <div>
            <p className="leave-eyebrow">PEOPLE OPERATIONS</p>
            <h1>Leave requests</h1>
            <p className="leave-intro-copy">Review employee time-off requests and decisions.</p>
          </div>
          <span className="leave-count" aria-label={`${leaves.length} leave requests`}>
            {leaves.length}
          </span>
        </section>

        {actionError && (
          <div className="leave-alert leave-alert-error" role="alert">
            <XCircle aria-hidden="true" size={18} />
            <span>{actionError}</span>
          </div>
        )}
        {successMessage && (
          <div className="leave-alert leave-alert-success" role="status">
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <section className="leave-panel leave-history" aria-label="All leave requests">
          <div className="leave-history-heading">
            <div>
              <h2>All requests</h2>
              <p>Employee details, request status, and review history</p>
            </div>
          </div>
          {loading ? (
            <p className="leave-empty-state" role="status">Loading leave requests…</p>
          ) : loadError ? (
            <div className="leave-empty-state" role="alert">
              <p>Could not load leave requests</p>
              <span>{loadError}</span>
              <button className="leave-secondary-button" type="button" onClick={retryLoad}>Try again</button>
            </div>
          ) : leaves.length === 0 ? (
            <div className="leave-empty-state">
              <ClipboardList aria-hidden="true" size={23} />
              <p>No leave requests yet</p>
              <span>Employee requests will appear here when submitted.</span>
            </div>
          ) : (
            <div className="leave-table-wrap">
              <table className="leave-table leave-admin-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Leave type</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Status</th>
                    <th scope="col">Reviewed by</th>
                    <th scope="col">Reviewed date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => {
                    const isPending = leave.status === 'PENDING'
                    const isReviewing = reviewingId === leave._id
                    return (
                      <tr key={leave._id}>
                        <td className="leave-employee-cell">
                          <strong>{leave.employeeId?.name || 'Unknown employee'}</strong>
                          <span>{leave.employeeId?.email || 'Email unavailable'}</span>
                          <span>{leave.employeeId?.designation || '—'} · {leave.employeeId?.departmentId?.name || '—'}</span>
                        </td>
                        <td className="leave-type-cell">{leave.leaveType}</td>
                        <td>
                          {formatLeaveDate(leave.startDate)}
                          <span className="leave-date-separator"> to </span>
                          {formatLeaveDate(leave.endDate)}
                        </td>
                        <td className="leave-reason-cell">{leave.reason}</td>
                        <td>
                          <span className={`leave-status status-${leave.status?.toLowerCase() || 'unknown'}`}>
                            {leave.status?.toLowerCase() || 'unknown'}
                          </span>
                        </td>
                        <td>{leave.reviewedBy?.name || '—'}</td>
                        <td>{formatLeaveDate(leave.reviewedAt)}</td>
                        <td className="leave-actions-cell">
                          {isPending ? (
                            <>
                              <button
                                className="leave-review-button leave-review-button--approve"
                                type="button"
                                disabled={isReviewing}
                                onClick={() => reviewRequest(leave, 'APPROVED')}
                              >
                                Approve
                              </button>
                              <button
                                className="leave-review-button leave-review-button--reject"
                                type="button"
                                disabled={isReviewing}
                                onClick={() => reviewRequest(leave, 'REJECTED')}
                              >
                                Reject
                              </button>
                              {isReviewing && <span className="leave-reviewing" role="status">Saving…</span>}
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AdminLeaveManagement

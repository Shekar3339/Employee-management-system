import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { listDepartments } from '../employees/employeeApi.js'
import {
  deleteAttendanceHoliday,
  getAttendanceSummary,
  listAttendance,
  listAttendanceCorrections,
  listAttendanceHolidays,
  listEmployees,
  reviewAttendanceCorrection,
  saveAttendanceHoliday,
} from './attendanceApi.js'
import {
  attendanceError,
  attendanceLateCutoff,
  attendanceTimeZone,
  displayAttendanceStatus,
  formatAttendanceDate,
  formatAttendanceTime,
  formatDuration,
  getWorkDate,
} from './attendanceUtils.js'

const pageSize = 25
const today = getWorkDate()
const initialFilters = { from: `${today.slice(0, 4)}-01-01`, to: today, employeeId: '', departmentId: '', status: '' }
const initialHoliday = { workDate: '', name: '', description: '' }

function AdminAttendance() {
  const [tab, setTab] = useState('records')
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [corrections, setCorrections] = useState([])
  const [holidays, setHolidays] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [busyId, setBusyId] = useState('')
  const [holidayForm, setHolidayForm] = useState(initialHoliday)
  const [editingHolidayId, setEditingHolidayId] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [attendanceResult, summaryResult, correctionResult, holidayResult, employeeResult, departmentResult] = await Promise.all([
          listAttendance({ ...appliedFilters, page, limit: pageSize }),
          getAttendanceSummary({
            from: appliedFilters.from,
            to: appliedFilters.to,
            departmentId: appliedFilters.departmentId,
            employeeId: appliedFilters.employeeId,
          }),
          listAttendanceCorrections({ status: 'PENDING', page: 1, limit: 100 }),
          listAttendanceHolidays({
            from: `${appliedFilters.from.slice(0, 4)}-01-01`,
            to: `${appliedFilters.from.slice(0, 4)}-12-31`,
          }),
          listEmployees({ page: 1, limit: 100 }),
          listDepartments(),
        ])
        if (active) {
          setRecords(attendanceResult.attendance)
          setPagination(attendanceResult.pagination)
          setSummary(summaryResult)
          setCorrections(correctionResult.corrections)
          setHolidays(holidayResult)
          setEmployees(employeeResult.employees)
          setDepartments(departmentResult)
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(attendanceError(error, 'Could not load attendance data.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [appliedFilters, page, reloadKey])

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((key) => key + 1)
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  async function reviewCorrection(correction, decision) {
    const action = decision === 'APPROVED' ? 'approve' : 'reject'
    if (!window.confirm(`Are you sure you want to ${action} this correction request?`)) return

    setBusyId(correction._id)
    setActionError('')
    setSuccessMessage('')
    try {
      await reviewAttendanceCorrection(correction._id, decision)
      setCorrections((current) => current.filter((item) => item._id !== correction._id))
      setSuccessMessage(`Correction request ${decision.toLowerCase()}.`)
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(attendanceError(error, `Could not ${action} this correction request.`))
    } finally {
      setBusyId('')
    }
  }

  function beginEditHoliday(holiday) {
    setEditingHolidayId(holiday._id)
    setHolidayForm({
      workDate: holiday.workDate,
      name: holiday.name,
      description: holiday.description || '',
    })
    setActionError('')
    setSuccessMessage('')
  }

  function cancelHolidayEdit() {
    setEditingHolidayId('')
    setHolidayForm(initialHoliday)
  }

  async function submitHoliday(event) {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')
    setBusyId('holiday')
    try {
      await saveAttendanceHoliday(holidayForm, editingHolidayId || undefined)
      setSuccessMessage(editingHolidayId ? 'Holiday updated.' : 'Holiday added.')
      cancelHolidayEdit()
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(attendanceError(error, 'Could not save this holiday.'))
    } finally {
      setBusyId('')
    }
  }

  async function removeHoliday(holiday) {
    if (!window.confirm(`Remove ${holiday.name} on ${formatAttendanceDate(holiday.workDate)} from the holiday calendar?`)) {
      return
    }
    setBusyId(holiday._id)
    setActionError('')
    setSuccessMessage('')
    try {
      await deleteAttendanceHoliday(holiday._id)
      setSuccessMessage('Holiday removed.')
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setActionError(attendanceError(error, 'Could not remove this holiday.'))
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="attendance-page attendance-page--admin">
      <header className="attendance-page__header">
        <div>
          <p className="attendance-eyebrow">PEOPLE OPERATIONS</p>
          <h1>Attendance management</h1>
          <p>Review attendance, correction requests, and the holiday calendar.</p>
        </div>
        <span className="attendance-timezone">
          {attendanceTimeZone} · Late after {attendanceLateCutoff}
        </span>
      </header>

      {loadError && (
        <div className="attendance-alert attendance-alert--error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={retryLoad}>Try again</button>
        </div>
      )}
      {actionError && <p className="attendance-alert attendance-alert--error" role="alert">{actionError}</p>}
      {successMessage && <p className="attendance-alert" role="status">{successMessage}</p>}

      <form className="attendance-filters attendance-filters--admin" onSubmit={applyFilters}>
        <label>From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} required /></label>
        <label>To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} required /></label>
        <label>
          Department
          <select value={filters.departmentId} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
        </label>
        <label>
          Employee
          <select value={filters.employeeId} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}>
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="INCOMPLETE">Incomplete</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>

      {summary && (
        <section className="attendance-summary" aria-label="Attendance summary">
          <article><span>Expected workdays</span><strong>{summary.scheduledWorkdays}</strong></article>
          <article><span>Present</span><strong>{summary.present}</strong></article>
          <article><span>Late</span><strong>{summary.late}</strong></article>
          <article><span>Incomplete</span><strong>{summary.incomplete}</strong></article>
          <article><span>Absent</span><strong>{summary.absent}</strong></article>
          <article><span>On leave</span><strong>{summary.onLeave}</strong></article>
          <article><span>Worked on holiday/weekend</span><strong>{summary.workedOnNonWorkingDay}</strong></article>
          <article><span>Work duration</span><strong>{formatDuration(summary.totalWorkDurationMinutes)}</strong></article>
        </section>
      )}

      <nav className="attendance-tabs" aria-label="Attendance administration">
        <button className={tab === 'records' ? 'active' : ''} type="button" onClick={() => setTab('records')}>Attendance records</button>
        <button className={tab === 'corrections' ? 'active' : ''} type="button" onClick={() => setTab('corrections')}>Corrections ({corrections.length})</button>
        <button className={tab === 'holidays' ? 'active' : ''} type="button" onClick={() => setTab('holidays')}>Holiday calendar</button>
      </nav>

      {tab === 'records' && (
        <section className="attendance-panel">
          <div className="attendance-panel__heading">
            <div><h2>Attendance records</h2><p>{pagination.total} records for the selected filters.</p></div>
          </div>
          {loading ? <p className="attendance-state" role="status">Loading attendance records…</p> : loadError ? (
            <p className="attendance-state">Attendance records are unavailable.</p>
          ) : records.length === 0 ? (
            <div className="attendance-state"><strong>No attendance records found</strong><span>Try a different date range or filter.</span></div>
          ) : (
            <>
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead><tr><th>Employee</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th><th>Notes</th></tr></thead>
                  <tbody>{records.map((record) => {
                    const status = displayAttendanceStatus(record)
                    return (
                      <tr key={record._id}>
                        <td className="attendance-employee-cell">
                          <strong>{record.employeeId?.name || 'Unknown employee'}</strong>
                          <span>{record.employeeId?.email || 'Email unavailable'}</span>
                          <span>{record.employeeId?.designation || '—'} · {record.employeeId?.departmentId?.name || '—'}</span>
                        </td>
                        <td>{formatAttendanceDate(record.workDate)}</td>
                        <td>{formatAttendanceTime(record.checkInAt)}</td>
                        <td>{formatAttendanceTime(record.checkOutAt)}</td>
                        <td>{formatDuration(record.workDurationMinutes)}</td>
                        <td><span className={`attendance-status attendance-status--${status.toLowerCase()}`}>{status}</span></td>
                        <td>{record.notes || '—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
              <div className="attendance-pagination">
                <span>Page {pagination.page} of {pagination.pages || 1}</span>
                <div>
                  <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <button type="button" disabled={loading || page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'corrections' && (
        <section className="attendance-panel">
          <div className="attendance-panel__heading">
            <div><h2>Pending correction requests</h2><p>Approvals apply the correction and retain original values for audit.</p></div>
          </div>
          {loading ? <p className="attendance-state" role="status">Loading correction requests…</p> : corrections.length === 0 ? (
            <div className="attendance-state"><CheckCircle2 aria-hidden="true" size={22} /><strong>No pending correction requests</strong></div>
          ) : (
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead><tr><th>Employee</th><th>Work date</th><th>Requested check-in</th><th>Requested check-out</th><th>Reason</th><th>Actions</th></tr></thead>
                <tbody>{corrections.map((item) => (
                  <tr key={item._id}>
                    <td className="attendance-employee-cell"><strong>{item.employeeId?.name || 'Unknown employee'}</strong><span>{item.employeeId?.email || 'Email unavailable'}</span></td>
                    <td>{formatAttendanceDate(item.workDate)}</td>
                    <td>{formatAttendanceTime(item.requestedCheckInAt)}</td>
                    <td>{formatAttendanceTime(item.requestedCheckOutAt)}</td>
                    <td>{item.reason}</td>
                    <td className="attendance-actions-cell">
                      <button className="attendance-action-button attendance-action-button--approve" type="button" disabled={busyId === item._id} onClick={() => reviewCorrection(item, 'APPROVED')}>Approve</button>
                      <button className="attendance-action-button attendance-action-button--reject" type="button" disabled={busyId === item._id} onClick={() => reviewCorrection(item, 'REJECTED')}>Reject</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'holidays' && (
        <section className="attendance-panel">
          <div className="attendance-panel__heading">
            <div className="attendance-panel__icon"><CalendarDays aria-hidden="true" size={20} /></div>
            <div><h2>Holiday calendar</h2><p>Configured holidays are excluded from absence reporting.</p></div>
          </div>
          <form className="attendance-holiday-form" onSubmit={submitHoliday}>
            <label>Date<input type="date" value={holidayForm.workDate} onChange={(event) => setHolidayForm({ ...holidayForm, workDate: event.target.value })} required /></label>
            <label>Name<input value={holidayForm.name} onChange={(event) => setHolidayForm({ ...holidayForm, name: event.target.value })} maxLength={120} required /></label>
            <label>Description<input value={holidayForm.description} onChange={(event) => setHolidayForm({ ...holidayForm, description: event.target.value })} maxLength={500} /></label>
            <div>
              <button type="submit" disabled={busyId === 'holiday'}>{busyId === 'holiday' ? 'Saving…' : editingHolidayId ? 'Update holiday' : 'Add holiday'}</button>
              {editingHolidayId && <button className="attendance-action-button" type="button" onClick={cancelHolidayEdit}>Cancel</button>}
            </div>
          </form>
          {loading ? <p className="attendance-state" role="status">Loading holiday calendar…</p> : holidays.length === 0 ? (
            <div className="attendance-state"><CalendarDays aria-hidden="true" size={22} /><strong>No holidays in this date range</strong></div>
          ) : (
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead><tr><th>Date</th><th>Holiday</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>{holidays.map((holiday) => (
                  <tr key={holiday._id}>
                    <td>{formatAttendanceDate(holiday.workDate)}</td>
                    <td>{holiday.name}</td>
                    <td>{holiday.description || '—'}</td>
                    <td className="attendance-actions-cell">
                      <button className="attendance-action-button" type="button" onClick={() => beginEditHoliday(holiday)}>Edit</button>
                      <button className="attendance-action-button attendance-action-button--reject" type="button" disabled={busyId === holiday._id} onClick={() => removeHoliday(holiday)}>Remove</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  )
}

export default AdminAttendance

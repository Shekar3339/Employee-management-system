import { useEffect, useState } from 'react'
import { CalendarClock, Clock3, RotateCcw } from 'lucide-react'
import {
  checkIn,
  checkOut,
  listMyAttendance,
  listMyCorrections,
  requestCorrection,
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
  localDateTimeToIso,
} from './attendanceUtils.js'

const pageSize = 10

function EmployeeAttendance() {
  const [currentRecord, setCurrentRecord] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [corrections, setCorrections] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ from: '', to: '', status: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [action, setAction] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [correction, setCorrection] = useState({
    workDate: getWorkDate(),
    checkInAt: '',
    checkOutAt: '',
    reason: '',
  })
  const [correctionError, setCorrectionError] = useState('')
  const [correctionSuccess, setCorrectionSuccess] = useState('')
  const [submittingCorrection, setSubmittingCorrection] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [currentResult, historyResult, correctionResult] = await Promise.all([
          listMyAttendance({ page: 1, limit: 100 }),
          listMyAttendance({ ...appliedFilters, page, limit: pageSize }),
          listMyCorrections({ page: 1, limit: 100 }),
        ])
        if (active) {
          const today = getWorkDate()
          setCurrentRecord(
            currentResult.attendance.find((record) => !record.checkOutAt)
            || currentResult.attendance.find((record) => record.workDate === today)
            || null,
          )
          setAttendance(historyResult.attendance)
          setPagination(historyResult.pagination)
          setCorrections(correctionResult.corrections)
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(attendanceError(error, 'Could not load your attendance.'))
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

  async function submitPunch(type) {
    setAction(type)
    setMessage('')
    setMessageIsError(false)
    try {
      if (type === 'check-in') await checkIn(notes)
      else await checkOut(notes)
      setNotes('')
      setMessage(type === 'check-in' ? 'Check-in recorded.' : 'Check-out recorded.')
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setMessage(attendanceError(error, `Could not ${type}.`))
      setMessageIsError(true)
    } finally {
      setAction('')
    }
  }

  async function submitCorrection(event) {
    event.preventDefault()
    setCorrectionError('')
    setCorrectionSuccess('')
    if (!correction.workDate || !correction.reason.trim()) {
      setCorrectionError('Work date and reason are required.')
      return
    }
    if (!correction.checkInAt && !correction.checkOutAt) {
      setCorrectionError('Enter the corrected check-in time, check-out time, or both.')
      return
    }

    setSubmittingCorrection(true)
    try {
      await requestCorrection({
        workDate: correction.workDate,
        checkInAt: localDateTimeToIso(correction.checkInAt) || undefined,
        checkOutAt: localDateTimeToIso(correction.checkOutAt) || undefined,
        reason: correction.reason.trim(),
      })
      setCorrection({
        workDate: getWorkDate(),
        checkInAt: '',
        checkOutAt: '',
        reason: '',
      })
      setCorrectionSuccess('Correction request submitted for admin review.')
      setLoading(true)
      setReloadKey((key) => key + 1)
    } catch (error) {
      setCorrectionError(attendanceError(error, 'Could not submit your correction request.'))
    } finally {
      setSubmittingCorrection(false)
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  const today = getWorkDate()
  const isOpen = currentRecord && !currentRecord.checkOutAt
  const alreadyCheckedOut = currentRecord?.workDate === today && currentRecord?.checkOutAt

  return (
    <section className="attendance-page">
      <header className="attendance-page__header">
        <div>
          <p className="attendance-eyebrow">EMPLOYEE SELF SERVICE</p>
          <h1>My attendance</h1>
          <p>Check in and out, review your attendance history, or request a correction.</p>
        </div>
        <span className="attendance-timezone">
          {attendanceTimeZone} · Late after {attendanceLateCutoff}
        </span>
      </header>

      {message && (
        <p className={`attendance-alert${messageIsError ? ' attendance-alert--error' : ''}`} role={messageIsError ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      {loadError && (
        <div className="attendance-alert attendance-alert--error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={retryLoad}>Try again</button>
        </div>
      )}

      <section className="attendance-panel attendance-today" aria-labelledby="attendance-today-title">
        <div className="attendance-panel__heading">
          <div className="attendance-panel__icon"><CalendarClock aria-hidden="true" size={20} /></div>
          <div>
            <h2 id="attendance-today-title">Today’s attendance</h2>
            <p>{formatAttendanceDate(today)}</p>
          </div>
          {currentRecord && (
            <span className={`attendance-status attendance-status--${displayAttendanceStatus(currentRecord).toLowerCase()}`}>
              {displayAttendanceStatus(currentRecord)}
            </span>
          )}
        </div>
        {loading ? (
          <p className="attendance-state" role="status">Loading attendance…</p>
        ) : isOpen ? (
          <div className="attendance-punch">
            <div className="attendance-punch__times">
              <span>Checked in {formatAttendanceTime(currentRecord.checkInAt)}</span>
              <span>Work date {formatAttendanceDate(currentRecord.workDate)}</span>
            </div>
            <label className="attendance-note-field">
              Check-out note (optional)
              <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
            </label>
            <button type="button" disabled={Boolean(action)} onClick={() => submitPunch('check-out')}>
              <Clock3 aria-hidden="true" size={17} />
              {action === 'check-out' ? 'Checking out…' : 'Check out'}
            </button>
          </div>
        ) : alreadyCheckedOut ? (
          <div className="attendance-state">
            <strong>Today’s attendance is complete.</strong>
            <span>Checked out {formatAttendanceTime(currentRecord.checkOutAt)} · {formatDuration(currentRecord.workDurationMinutes)}</span>
          </div>
        ) : (
          <div className="attendance-punch">
            <p className="attendance-state">You have not checked in today.</p>
            <label className="attendance-note-field">
              Check-in note (optional)
              <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
            </label>
            <button type="button" disabled={Boolean(action)} onClick={() => submitPunch('check-in')}>
              <Clock3 aria-hidden="true" size={17} />
              {action === 'check-in' ? 'Checking in…' : 'Check in'}
            </button>
          </div>
        )}
      </section>

      <section className="attendance-panel">
        <div className="attendance-panel__heading">
          <div>
            <h2>Attendance history</h2>
            <p>Filter and review your punches and work duration.</p>
          </div>
        </div>
        <form className="attendance-filters" onSubmit={applyFilters}>
          <label>From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
          <label>To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
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
        {loading ? (
          <p className="attendance-state" role="status">Loading attendance history…</p>
        ) : attendance.length === 0 ? (
          <div className="attendance-state">
            <strong>No attendance records found</strong>
            <span>Try another date range or status filter.</span>
          </div>
        ) : (
          <>
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead>
                  <tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {attendance.map((record) => {
                    const status = displayAttendanceStatus(record)
                    return (
                      <tr key={record._id}>
                        <td>{formatAttendanceDate(record.workDate)}</td>
                        <td>{formatAttendanceTime(record.checkInAt)}</td>
                        <td>{formatAttendanceTime(record.checkOutAt)}</td>
                        <td>{formatDuration(record.workDurationMinutes)}</td>
                        <td><span className={`attendance-status attendance-status--${status.toLowerCase()}`}>{status}</span></td>
                        <td>{record.notes || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="attendance-pagination">
              <span>{pagination.total} records · Page {pagination.page} of {pagination.pages || 1}</span>
              <div>
                <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" disabled={loading || page >= pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="attendance-panel">
        <div className="attendance-panel__heading">
          <div className="attendance-panel__icon"><RotateCcw aria-hidden="true" size={20} /></div>
          <div>
            <h2>Request a correction</h2>
            <p>Requests must be submitted within 7 calendar days and include a reason.</p>
          </div>
        </div>
        {correctionError && <p className="attendance-alert attendance-alert--error" role="alert">{correctionError}</p>}
        {correctionSuccess && <p className="attendance-alert" role="status">{correctionSuccess}</p>}
        <form className="attendance-correction-form" onSubmit={submitCorrection}>
          <label>Work date<input type="date" value={correction.workDate} onChange={(event) => setCorrection({ ...correction, workDate: event.target.value })} required /></label>
          <label>Corrected check-in<input type="datetime-local" value={correction.checkInAt} onChange={(event) => setCorrection({ ...correction, checkInAt: event.target.value })} /></label>
          <label>Corrected check-out<input type="datetime-local" value={correction.checkOutAt} onChange={(event) => setCorrection({ ...correction, checkOutAt: event.target.value })} /></label>
          <label className="attendance-correction-form__reason">Reason<textarea value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} maxLength={500} rows={3} required /></label>
          <button type="submit" disabled={submittingCorrection}>{submittingCorrection ? 'Submitting…' : 'Submit correction request'}</button>
        </form>
        <div className="attendance-correction-history">
          <h3>Correction requests</h3>
          {loading ? <p className="attendance-state" role="status">Loading correction requests…</p> : corrections.length === 0 ? (
            <p className="attendance-state">You have no correction requests.</p>
          ) : (
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead><tr><th>Work date</th><th>Requested check-in</th><th>Requested check-out</th><th>Reason</th><th>Status</th><th>Review details</th></tr></thead>
                <tbody>{corrections.map((item) => (
                  <tr key={item._id}>
                    <td>{formatAttendanceDate(item.workDate)}</td>
                    <td>{formatAttendanceTime(item.requestedCheckInAt)}</td>
                    <td>{formatAttendanceTime(item.requestedCheckOutAt)}</td>
                    <td>{item.reason}</td>
                    <td><span className={`attendance-status attendance-status--${item.status.toLowerCase()}`}>{item.status}</span></td>
                    <td>{item.reviewedBy?.name || '—'}{item.reviewedAt ? ` · ${formatAttendanceDate(item.reviewedAt)}` : ''}{item.reviewNote ? ` · ${item.reviewNote}` : ''}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

export default EmployeeAttendance

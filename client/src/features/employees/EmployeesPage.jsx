import { useCallback, useEffect, useReducer, useState } from 'react'
import { listDepartments, listEmployees, updateEmployeeStatus } from './employeeApi.js'
import EmployeeForm from './EmployeeForm.jsx'
import { copyTemporaryPassword, emptyTemporaryPasswordState, temporaryPasswordReducer } from './temporaryPasswordState.js'
import './employees.css'

function getDepartmentName(employee) {
  return employee.departmentId?.name || '—'
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })
  const [filters, setFilters] = useState({ search: '', departmentId: '', status: '' })
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [temporaryPasswordState, dispatchTemporaryPassword] = useReducer(temporaryPasswordReducer, emptyTemporaryPasswordState)
  const [copyError, setCopyError] = useState('')

  const loadEmployees = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const result = await listEmployees({ ...filters, page, limit: pagination.limit })
      setEmployees(result.employees || [])
      setPagination(result.pagination || { page, limit: 10, total: (result.employees || []).length, pages: 1 })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load employees.')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit])

  useEffect(() => {
    let active = true
    listEmployees({ ...filters, page: 1, limit: pagination.limit })
      .then((result) => {
        if (!active) return
        setEmployees(result.employees || [])
        setPagination(result.pagination || { page: 1, limit: 10, total: (result.employees || []).length, pages: 1 })
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Could not load employees.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, pagination.limit])

  useEffect(() => {
    let active = true
    listDepartments()
      .then((items) => { if (active) setDepartments(items) })
      .catch(() => { if (active) setError('Could not load departments. Department filtering may be unavailable.') })
    return () => { active = false }
  }, [])

  function startCreate() {
    setEditingEmployee(null)
    setShowForm(true)
    setNotice('')
    setError('')
    setCopyError('')
  }

  function startEdit(employee) {
    setEditingEmployee(employee)
    setShowForm(true)
    setNotice('')
  }

  async function changeStatus(employee) {
    const nextStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const action = nextStatus === 'INACTIVE' ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} ${employee.name}?`)) return
    setError('')
    setNotice('')
    try {
      await updateEmployeeStatus(employee._id, nextStatus)
      setNotice(`${employee.name} was ${nextStatus === 'ACTIVE' ? 'reactivated' : 'deactivated'}.`)
      await loadEmployees(pagination.page)
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${action} this employee.`)
    }
  }

  async function saved({ created, result } = {}) {
    setShowForm(false)
    setEditingEmployee(null)
    setNotice(created ? 'Employee created.' : 'Employee changes saved.')
    if (created && result?.temporaryPassword) {
      dispatchTemporaryPassword({ type: 'created', temporaryPassword: result.temporaryPassword })
      setCopyError('')
    } else if (created) {
      setError('Employee was created, but the server did not return its temporary password.')
    }
    await loadEmployees(1)
  }

  function dismissTemporaryPassword() {
    dispatchTemporaryPassword({ type: 'dismiss' })
    setCopyError('')
  }

  async function copyPassword() {
    try {
      const copied = await copyTemporaryPassword(temporaryPasswordState, navigator.clipboard)
      if (!copied) throw new Error('Clipboard is unavailable')
      dispatchTemporaryPassword({ type: 'copied' })
      setCopyError('')
    } catch {
      setCopyError('Clipboard access is unavailable. Select and copy the password manually.')
    }
  }

  return (
    <main className="employees-page">
      <header className="employees-header">
        <div>
          <p className="employee-eyebrow">PEOPLE OPERATIONS</p>
          <h1>Employees</h1>
          <p className="employees-header__sub">Manage employee records and account status.</p>
        </div>
        {!showForm && <button className="employee-button employee-button--primary" onClick={startCreate}>Add employee</button>}
      </header>

      {notice && <p className="employee-alert employee-alert--success" role="status">{notice}</p>}
      {error && <p className="employee-alert employee-alert--error" role="alert">{error}</p>}
      {showForm ? (
        <EmployeeForm key={editingEmployee?._id || 'new'} employee={editingEmployee} onCancel={() => setShowForm(false)} onSaved={saved} />
      ) : (
        <section className="employee-panel" aria-label="Employee directory">
          <div className="employees-toolbar">
            <label className="employees-search">
              <span className="sr-only">Search employees</span>
              <input type="search" placeholder="Search name, email, or designation" value={filters.search}
                onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, search: event.target.value })) }} />
            </label>
            <label>
              <span className="sr-only">Filter by department</span>
              <select value={filters.departmentId} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, departmentId: event.target.value })) }}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={filters.status} onChange={(event) => { setLoading(true); setFilters((current) => ({ ...current, status: event.target.value })) }}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>

          {loading ? <div className="employee-state" role="status">Loading employees…</div> : employees.length === 0 ? (
            <div className="employee-state"><strong>No employees found</strong><span>Try changing your search or filters.</span></div>
          ) : (
            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead><tr><th>Employee</th><th>Designation</th><th>Department</th><th>Joining date</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{employees.map((employee) => (
                  <tr key={employee._id}>
                    <td><strong>{employee.name}</strong><span className="employee-table__secondary">{employee.email}</span></td>
                    <td>{employee.designation}</td>
                    <td>{getDepartmentName(employee)}</td>
                    <td>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '—'}</td>
                    <td><span className={`employee-status employee-status--${employee.status?.toLowerCase()}`}>{employee.status}</span></td>
                    <td className="employee-table__actions">
                      <button className="employee-text-button" onClick={() => startEdit(employee)}>Edit</button>
                      <button className="employee-text-button" onClick={() => changeStatus(employee)}>{employee.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          <footer className="employees-pagination">
            <span>{pagination.total} employee{pagination.total === 1 ? '' : 's'}</span>
            <div>
              <button className="employee-button employee-button--quiet" disabled={loading || pagination.page <= 1} onClick={() => loadEmployees(pagination.page - 1)}>Previous</button>
              <span>Page {pagination.page || 1} of {pagination.pages || 1}</span>
              <button className="employee-button employee-button--quiet" disabled={loading || pagination.page >= pagination.pages} onClick={() => loadEmployees(pagination.page + 1)}>Next</button>
            </div>
          </footer>
        </section>
      )}
      {temporaryPasswordState.open && (
        <div className="temporary-password-backdrop">
          <section className="temporary-password-modal" role="dialog" aria-modal="true" aria-labelledby="temporary-password-title">
            <p className="employee-eyebrow">ACCOUNT CREATED</p>
            <h2 id="temporary-password-title">Temporary password</h2>
            <p>Copy this password now and share it securely with the employee. It will not be shown again after closing.</p>
            <output className="temporary-password-value" aria-label="Temporary password">{temporaryPasswordState.temporaryPassword}</output>
            {copyError && <p className="employee-alert employee-alert--error" role="alert">{copyError}</p>}
            <div className="temporary-password-actions">
              <button className="employee-button employee-button--quiet" type="button" onClick={dismissTemporaryPassword}>Close</button>
              <button className="employee-button employee-button--primary" type="button" onClick={copyPassword}>
                {temporaryPasswordState.copied ? 'Copied' : 'Copy password'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

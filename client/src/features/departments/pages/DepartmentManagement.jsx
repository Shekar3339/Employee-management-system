import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import DepartmentForm from '../components/DepartmentForm.jsx'
import DepartmentTable from '../components/DepartmentTable.jsx'
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from '../services/departmentService.js'
import { normalizeDepartmentForm, validateDepartmentForm } from '../departmentValidation.js'
import './DepartmentManagement.css'

const emptyForm = { name: '', description: '' }

function getErrorMessage(error) {
  if (!error.response) {
    return 'Unable to reach the EmployeeHub API. Check that the backend is running and VITE_API_BASE_URL points to it.'
  }

  const message = error.response.data?.message
  if (message) return message

  if (error.response.status === 404) {
    return 'The departments API endpoint was not found. Check that the backend router is mounted at /api/departments.'
  }

  if (error.response.status === 401) {
    return 'Sign in to view departments.'
  }

  if (error.response.status === 403) {
    return 'Your account does not have permission to perform this department action.'
  }

  return `The department request failed (HTTP ${error.response.status}). Please try again.`
}

function DepartmentManagement({ canManage = false }) {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)

  const loadDepartments = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setDepartments(await getDepartments())
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getDepartments()
      .then((items) => {
        if (active) setDepartments(items)
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setEditingId('')
    setFormError('')
    setFieldErrors({})
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = normalizeDepartmentForm(form)
    const validationErrors = validateDepartmentForm(payload)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setFormError('Please correct the highlighted fields.')
      return
    }

    setSaving(true)
    setFormError('')
    setFieldErrors({})
    setNotice('')
    setNoticeIsError(false)
    try {
      if (editingId) {
        await updateDepartment(editingId, payload)
        setNotice('Department updated successfully.')
      } else {
        await createDepartment(payload)
        setNotice('Department added successfully.')
      }
      resetForm()
      await loadDepartments()
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setFieldErrors(Object.fromEntries(
        apiErrors
          .filter((item) => item?.field && item?.message)
          .map((item) => [item.field, item.message]),
      ))
      setFormError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(department) {
    setForm({ name: department.name, description: department.description || '' })
    setEditingId(department._id)
    setFormError('')
    setFieldErrors({})
    setNotice('')
    setNoticeIsError(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFormChange(nextForm) {
    const changedField = Object.keys(nextForm).find((key) => nextForm[key] !== form[key])
    setForm(nextForm)
    if (changedField) setFieldErrors((current) => ({ ...current, [changedField]: undefined }))
    setFormError('')
  }

  async function handleDelete(department) {
    if (!window.confirm(`Delete “${department.name}”? This action cannot be undone.`)) return
    setNotice('')
    try {
      await deleteDepartment(department._id)
      setNotice('Department deleted successfully.')
      setNoticeIsError(false)
      if (editingId === department._id) resetForm()
      await loadDepartments()
    } catch (error) {
      setNotice(getErrorMessage(error))
      setNoticeIsError(true)
    }
  }

  return (
    <main className="department-page">
      <header className="department-header">
        <div>
          <p className="department-eyebrow">PEOPLE OPERATIONS</p>
          <h1>Departments</h1>
          <p className="department-subtitle">Organize teams and see where your active employees work.</p>
        </div>
        <button className="department-refresh" type="button" onClick={loadDepartments} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      {notice && <p className={`department-notice${noticeIsError ? ' error' : ''}`} role={noticeIsError ? 'alert' : 'status'}>{notice}</p>}

      {canManage && (
        <DepartmentForm
          editing={Boolean(editingId)}
          error={formError}
          fieldErrors={fieldErrors}
          form={form}
          onCancel={resetForm}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}

      <section className="department-list-section" aria-labelledby="department-list-title">
        <div className="department-list-heading">
          <div>
            <h2 id="department-list-title">Your departments</h2>
            <p>
              {loading
                ? 'Loading departments…'
                : loadError
                  ? 'Department list unavailable'
                  : `${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="department-state" role="status"><span className="department-spinner" /> Loading departments…</div>
        ) : loadError ? (
          <div className="department-state department-state-error" role="alert">
            <p>{loadError}</p><button className="department-button secondary" onClick={loadDepartments} type="button">Try again</button>
          </div>
        ) : departments.length === 0 ? (
          <div className="department-state">No departments yet. {canManage ? 'Add your first department above.' : ''}</div>
        ) : (
          <DepartmentTable
            canManage={canManage}
            departments={departments}
            onDelete={handleDelete}
            onEdit={beginEdit}
          />
        )}
      </section>
    </main>
  )
}

export default DepartmentManagement

import { useEffect, useState } from 'react'
import { createEmployee, listDepartments, updateEmployee } from './employeeApi.js'
import { normalizeEmployeeForm, validateEmployeeForm } from './employeeValidation.js'

const blankForm = {
  name: '',
  email: '',
  phone: '',
  designation: '',
  departmentId: '',
  joiningDate: '',
}

function toDateInput(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function formForEmployee(employee) {
  if (!employee) return blankForm
  return {
    name: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    designation: employee.designation || '',
    departmentId: employee.departmentId?._id || employee.departmentId || '',
    joiningDate: toDateInput(employee.joiningDate),
  }
}

export default function EmployeeForm({ employee, onCancel, onSaved }) {
  const editing = Boolean(employee)
  const [form, setForm] = useState(() => formForEmployee(employee))
  const [departments, setDepartments] = useState([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true
    listDepartments()
      .then((items) => { if (active) setDepartments(items) })
      .catch(() => { if (active) setError('Could not load departments. Check the departments API.') })
      .finally(() => { if (active) setLoadingDepartments(false) })
    return () => { active = false }
  }, [])

  function setField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    const normalizedForm = normalizeEmployeeForm(form)
    const validationErrors = validateEmployeeForm(normalizedForm)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError('Please correct the highlighted fields.')
      return
    }

    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const result = editing
        ? await updateEmployee(employee._id, normalizedForm)
        : await createEmployee(normalizedForm)
      onSaved({ created: !editing, result })
    } catch (requestError) {
      const errors = requestError.response?.data?.errors || []
      const apiFieldErrors = Object.fromEntries(
        errors
          .filter((item) => item?.field && item?.message)
          .map((item) => [item.field, item.message]),
      )
      setFieldErrors(apiFieldErrors)
      setError(requestError.response?.data?.message || 'Unable to save this employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="employee-panel" aria-labelledby="employee-form-title">
      <div className="employee-panel__heading">
        <div>
          <p className="employee-eyebrow">EMPLOYEE RECORD</p>
          <h2 id="employee-form-title">{editing ? 'Edit employee' : 'Add employee'}</h2>
        </div>
        <button className="employee-button employee-button--quiet" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error && <p className="employee-alert employee-alert--error" role="alert">{error}</p>}
      <form className="employee-form" onSubmit={submit} noValidate>
        <label>Full name<input name="name" value={form.name} onChange={setField} autoComplete="name" minLength={2} maxLength={100} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'employee-name-error' : undefined} required />{fieldErrors.name && <span id="employee-name-error" className="employee-field-error">{fieldErrors.name}</span>}</label>
        <label>Email<input name="email" type="email" value={form.email} onChange={setField} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'employee-email-error' : undefined} required />{fieldErrors.email && <span id="employee-email-error" className="employee-field-error">{fieldErrors.email}</span>}</label>
        <label>Phone<input name="phone" value={form.phone} onChange={setField} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'employee-phone-error' : undefined} />{fieldErrors.phone && <span id="employee-phone-error" className="employee-field-error">{fieldErrors.phone}</span>}</label>
        <label>Designation<input name="designation" value={form.designation} onChange={setField} minLength={2} maxLength={100} aria-invalid={Boolean(fieldErrors.designation)} aria-describedby={fieldErrors.designation ? 'employee-designation-error' : undefined} required />{fieldErrors.designation && <span id="employee-designation-error" className="employee-field-error">{fieldErrors.designation}</span>}</label>
        <label>Department
          <select name="departmentId" value={form.departmentId} onChange={setField} aria-invalid={Boolean(fieldErrors.departmentId)} aria-describedby={fieldErrors.departmentId ? 'employee-department-error' : undefined} required disabled={loadingDepartments}>
            <option value="">{loadingDepartments ? 'Loading departments…' : 'Select a department'}</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
          {fieldErrors.departmentId && <span id="employee-department-error" className="employee-field-error">{fieldErrors.departmentId}</span>}
        </label>
        <label>Joining date<input name="joiningDate" type="date" value={form.joiningDate} onChange={setField} max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(fieldErrors.joiningDate)} aria-describedby={fieldErrors.joiningDate ? 'employee-date-error' : undefined} required />{fieldErrors.joiningDate && <span id="employee-date-error" className="employee-field-error">{fieldErrors.joiningDate}</span>}</label>
        <div className="employee-form__actions employee-form__wide">
          <button className="employee-button employee-button--primary" disabled={saving || loadingDepartments || departments.length === 0}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </section>
  )
}

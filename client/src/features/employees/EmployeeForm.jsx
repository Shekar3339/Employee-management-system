import { useEffect, useState } from 'react'
import { createEmployee, listDepartments, updateEmployee } from './employeeApi.js'

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

  useEffect(() => {
    let active = true
    listDepartments()
      .then((items) => { if (active) setDepartments(items) })
      .catch(() => { if (active) setError('Could not load departments. Check the departments API.') })
      .finally(() => { if (active) setLoadingDepartments(false) })
    return () => { active = false }
  }, [])

  function setField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = editing
        ? await updateEmployee(employee._id, form)
        : await createEmployee(form)
      onSaved({ created: !editing, result })
    } catch (requestError) {
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
      <form className="employee-form" onSubmit={submit}>
        <label>Full name<input name="name" value={form.name} onChange={setField} required /></label>
        <label>Email<input name="email" type="email" value={form.email} onChange={setField} required /></label>
        <label>Phone<input name="phone" value={form.phone} onChange={setField} /></label>
        <label>Designation<input name="designation" value={form.designation} onChange={setField} required /></label>
        <label>Department
          <select name="departmentId" value={form.departmentId} onChange={setField} required disabled={loadingDepartments}>
            <option value="">{loadingDepartments ? 'Loading departments…' : 'Select a department'}</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
        </label>
        <label>Joining date<input name="joiningDate" type="date" value={form.joiningDate} onChange={setField} required /></label>
        <div className="employee-form__actions employee-form__wide">
          <button className="employee-button employee-button--primary" disabled={saving || loadingDepartments || departments.length === 0}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </section>
  )
}

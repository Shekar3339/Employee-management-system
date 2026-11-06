import { Plus, X } from 'lucide-react'

function DepartmentForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  editing,
  saving,
  error,
}) {
  return (
    <section className="department-card department-form-card" aria-labelledby="department-form-title">
      <div className="department-card-heading">
        <span className="department-icon"><Plus size={19} aria-hidden="true" /></span>
        <div>
          <h2 id="department-form-title">{editing ? 'Edit department' : 'Add a department'}</h2>
          <p>Department names must be unique.</p>
        </div>
      </div>
      <form className="department-form" onSubmit={onSubmit}>
        <label>
          Department name <span aria-hidden="true">*</span>
          <input
            autoComplete="organization-title"
            maxLength={100}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="e.g. People & Culture"
            required
            value={form.name}
          />
        </label>
        <label>
          Description <span className="department-optional">Optional</span>
          <textarea
            maxLength={500}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
            placeholder="What does this department do?"
            rows={3}
            value={form.description}
          />
        </label>
        {error && <p className="department-error" role="alert">{error}</p>}
        <div className="department-form-actions">
          {editing && <button className="department-button secondary" onClick={onCancel} type="button"><X size={16} /> Cancel</button>}
          <button className="department-button primary" disabled={saving} type="submit">
            <Plus size={16} aria-hidden="true" /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Add department'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default DepartmentForm

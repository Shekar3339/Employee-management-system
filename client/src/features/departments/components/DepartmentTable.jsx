import { Pencil, Trash2 } from 'lucide-react'

function DepartmentTable({ departments, canManage, onEdit, onDelete }) {
  return (
    <div className="department-table-wrap">
      <table className="department-table">
        <thead>
          <tr>
            <th scope="col">Department</th>
            <th scope="col">Description</th>
            <th scope="col">Active employees</th>
            {canManage && <th scope="col"><span className="visually-hidden">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department._id}>
              <td><span className="department-name">{department.name}</span></td>
              <td className="department-description">{department.description || '—'}</td>
              <td><span className="employee-count">{department.activeEmployeeCount ?? 0}</span></td>
              {canManage && (
                <td className="department-row-actions">
                  <button aria-label={`Edit ${department.name}`} className="department-icon-button" onClick={() => onEdit(department)} type="button"><Pencil size={16} /></button>
                  <button aria-label={`Delete ${department.name}`} className="department-icon-button danger" onClick={() => onDelete(department)} type="button"><Trash2 size={16} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DepartmentTable

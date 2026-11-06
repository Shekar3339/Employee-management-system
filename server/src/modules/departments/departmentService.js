import mongoose from 'mongoose'

export class DepartmentError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message)
    this.name = 'DepartmentError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

function normalizeDepartmentInput(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) {
    throw new DepartmentError('Department name is required.', 400, [
      { field: 'name', message: 'Department name is required.' },
    ])
  }

  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new DepartmentError('Description must be a string.', 400, [
      { field: 'description', message: 'Description must be a string.' },
    ])
  }

  const department = { name }
  if (input.description !== undefined) {
    department.description = input.description.trim()
  }
  return department
}

function translateDatabaseError(error) {
  if (error?.code === 11000) {
    return new DepartmentError('A department with this name already exists.', 409, [
      { field: 'name', message: 'Department names must be unique.' },
    ])
  }

  if (error?.name === 'ValidationError') {
    return new DepartmentError('Department data is invalid.', 400, [
      { message: error.message },
    ])
  }

  return error
}

function isValidId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new DepartmentError('Department was not found.', 404)
  }
}

export function createDepartmentService({ Department, Employee }) {
  return {
    async list() {
      const [departments, employeeCounts] = await Promise.all([
        Department.find().sort({ name: 1 }).lean(),
        Employee.aggregate([
          { $match: { status: 'ACTIVE' } },
          { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        ]),
      ])
      const countsByDepartment = new Map(
        employeeCounts.map(({ _id, count }) => [String(_id), count]),
      )

      return departments.map((department) => ({
        ...department,
        activeEmployeeCount: countsByDepartment.get(String(department._id)) ?? 0,
      }))
    },

    async create(input) {
      try {
        const department = new Department(normalizeDepartmentInput(input))
        return await department.save()
      } catch (error) {
        throw translateDatabaseError(error)
      }
    },

    async update(id, input) {
      isValidId(id)
      try {
        const department = await Department.findByIdAndUpdate(
          id,
          { $set: normalizeDepartmentInput(input) },
          { new: true, runValidators: true },
        )
        if (!department) {
          throw new DepartmentError('Department was not found.', 404)
        }
        return department
      } catch (error) {
        if (error instanceof DepartmentError) throw error
        throw translateDatabaseError(error)
      }
    },

    async remove(id) {
      isValidId(id)
      const activeEmployeeCount = await Employee.countDocuments({
        departmentId: id,
        status: 'ACTIVE',
      })
      if (activeEmployeeCount > 0) {
        throw new DepartmentError(
          'This department cannot be deleted while it has active employees.',
          409,
          [{ field: 'departmentId', message: 'Move or deactivate active employees first.' }],
        )
      }

      const department = await Department.findByIdAndDelete(id)
      if (!department) {
        throw new DepartmentError('Department was not found.', 404)
      }
      return department
    },
  }
}

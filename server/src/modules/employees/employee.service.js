import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { Department, Employee, User } from '../../shared/models/index.js'

const isObjectId = (value) => mongoose.isValidObjectId(value)

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10))
  return { page, limit }
}

function validateEmployeeFields(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [{ field: 'body', message: 'A JSON object is required' }]
  }
  const fields = ['name', 'email', 'phone', 'designation', 'departmentId', 'joiningDate']
  const errors = []

  for (const field of fields) {
    if (!partial && field !== 'phone' && (input[field] === undefined || input[field] === '')) {
      errors.push({ field, message: `${field} is required` })
    }
    if (partial && input[field] !== undefined && field !== 'phone' && input[field] === '') {
      errors.push({ field, message: `${field} cannot be empty` })
    }
  }

  for (const field of ['name', 'email', 'phone', 'designation']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      errors.push({ field, message: `${field} must be a string` })
    }
  }
  for (const field of ['name', 'email', 'designation']) {
    if (typeof input[field] === 'string' && input[field].trim() === '' && (!partial || input[field] !== undefined)) {
      errors.push({ field, message: `${field} cannot be empty` })
    }
  }

  if (input.email !== undefined && !/^\S+@\S+\.\S+$/.test(input.email)) {
    errors.push({ field: 'email', message: 'A valid email is required' })
  }
  if (input.departmentId !== undefined && !isObjectId(input.departmentId)) {
    errors.push({ field: 'departmentId', message: 'A valid department ID is required' })
  }
  if (input.joiningDate !== undefined && Number.isNaN(Date.parse(input.joiningDate))) {
    errors.push({ field: 'joiningDate', message: 'A valid joining date is required' })
  }

  return errors
}

function employeePayload(input) {
  const payload = {}
  for (const field of ['name', 'email', 'phone', 'designation', 'departmentId', 'joiningDate']) {
    if (input[field] !== undefined) payload[field] = input[field]
  }
  if (payload.email) payload.email = payload.email.trim().toLowerCase()
  if (payload.name) payload.name = payload.name.trim()
  if (payload.joiningDate) payload.joiningDate = new Date(payload.joiningDate)
  return payload
}

function transactionUnavailable(error) {
  return /transaction numbers are only allowed|transactions? (?:are|is) not supported|does not support transactions|transaction support is not available/i.test(error.message || '')
}

function plainEmployee(employee) {
  return typeof employee?.toObject === 'function' ? employee.toObject() : employee
}

async function rollbackCreated({ employeeId, userId }, EmployeeModel, UserModel) {
  if (employeeId) await EmployeeModel.deleteOne({ _id: employeeId })
  if (userId) await UserModel.deleteOne({ _id: userId })
}

export function createEmployeeService({ hashPassword, models = {}, database = mongoose }) {
  if (typeof hashPassword !== 'function') {
    throw new TypeError('Employee module requires the shared hashPassword utility.')
  }
  const { Department: DepartmentModel = Department, Employee: EmployeeModel = Employee, User: UserModel = User } = models

  async function createRecords(data, session) {
    const user = new UserModel({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: 'EMPLOYEE',
      employeeId: null,
      isActive: true,
    })
    if (session) await user.save({ session })
    else await user.save()

    const employee = new EmployeeModel({
      userId: user._id,
      ...data.employee,
      status: 'ACTIVE',
    })
    if (session) await employee.save({ session })
    else await employee.save()

    user.employeeId = employee._id
    if (session) await user.save({ session })
    else await user.save()

    return employee
  }

  return {
    async list(query) {
      const { page, limit } = parsePagination(query)
      const filter = {}
      if (query.departmentId) {
        if (!isObjectId(query.departmentId)) throw Object.assign(new Error('Invalid department ID'), { status: 400 })
        filter.departmentId = query.departmentId
      }
      if (query.status) {
        if (!['ACTIVE', 'INACTIVE'].includes(query.status)) throw Object.assign(new Error('Invalid employee status'), { status: 400 })
        filter.status = query.status
      }
      if (query.search?.trim()) {
        const search = new RegExp(escapeRegex(query.search.trim()), 'i')
        filter.$or = [{ name: search }, { email: search }, { designation: search }]
      }

      const [employees, total] = await Promise.all([
        EmployeeModel.find(filter)
          .populate('departmentId', 'name')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        EmployeeModel.countDocuments(filter),
      ])
      return { employees, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
    },

    async create(input) {
      const errors = validateEmployeeFields(input)
      if (errors.length) throw Object.assign(new Error('Validation failed'), { status: 400, errors })

      const employeeData = employeePayload(input)
      if (!(await DepartmentModel.exists({ _id: employeeData.departmentId }))) {
        throw Object.assign(new Error('Department not found'), { status: 400, errors: [{ field: 'departmentId', message: 'Department not found' }] })
      }
      if (await UserModel.exists({ email: employeeData.email })) {
        throw Object.assign(new Error('Email already exists'), { status: 409 })
      }

      const temporaryPassword = randomBytes(24).toString('base64url')
      const passwordHash = await hashPassword(temporaryPassword)
      let session
      try {
        session = await database.startSession()
        let created
        try {
          await session.withTransaction(async () => {
            created = await createRecords({
              name: employeeData.name,
              email: employeeData.email,
              passwordHash,
              employee: employeeData,
            }, session)
          })
          return { employee: plainEmployee(created), temporaryPassword }
        } catch (error) {
          if (error.code === 11000) throw Object.assign(new Error('Email already exists'), { status: 409 })
          if (!transactionUnavailable(error)) throw error
        }
      } finally {
        await session?.endSession()
      }

      let userId
      let employeeId
      try {
        const user = new UserModel({
          name: employeeData.name,
          email: employeeData.email,
          passwordHash,
          role: 'EMPLOYEE',
          employeeId: null,
          isActive: true,
        })
        await user.save()
        userId = user._id
        const employee = new EmployeeModel({ ...employeeData, userId, status: 'ACTIVE' })
        await employee.save()
        employeeId = employee._id
        user.employeeId = employeeId
        await user.save()
        return { employee: plainEmployee(employee), temporaryPassword }
      } catch (error) {
        await rollbackCreated({ employeeId, userId }, EmployeeModel, UserModel)
        if (error.code === 11000) throw Object.assign(new Error('Email already exists'), { status: 409 })
        throw error
      }
    },

    async getById(id) {
      if (!isObjectId(id)) throw Object.assign(new Error('Invalid employee ID'), { status: 400 })
      const employee = await EmployeeModel.findById(id).populate('departmentId', 'name').lean()
      if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 })
      return employee
    },

    async getMe(employeeId) {
      if (!employeeId || !isObjectId(employeeId)) throw Object.assign(new Error('Employee profile not found'), { status: 404 })
      const employee = await EmployeeModel.findById(employeeId).populate('departmentId', 'name').lean()
      if (!employee) throw Object.assign(new Error('Employee profile not found'), { status: 404 })
      return employee
    },

    async update(id, input) {
      if (!isObjectId(id)) throw Object.assign(new Error('Invalid employee ID'), { status: 400 })
      const errors = validateEmployeeFields(input, { partial: true })
      if (Object.keys(employeePayload(input || {})).length === 0) errors.push({ field: 'body', message: 'At least one editable field is required' })
      if (errors.length) throw Object.assign(new Error('Validation failed'), { status: 400, errors })

      const employee = await EmployeeModel.findById(id)
      if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 })
      const changes = employeePayload(input)
      if (changes.departmentId && !(await DepartmentModel.exists({ _id: changes.departmentId }))) {
        throw Object.assign(new Error('Department not found'), { status: 400, errors: [{ field: 'departmentId', message: 'Department not found' }] })
      }
      if (changes.email && changes.email !== employee.email && await UserModel.exists({ email: changes.email, _id: { $ne: employee.userId } })) {
        throw Object.assign(new Error('Email already exists'), { status: 409 })
      }

      const original = Object.fromEntries(Object.keys(changes).map((key) => [key, employee[key]]))
      const originalUser = (changes.email || changes.name)
        ? await UserModel.findById(employee.userId).select('name email').lean()
        : null
      if ((changes.email || changes.name) && !originalUser) {
        throw Object.assign(new Error('Linked user not found'), { status: 404 })
      }
      Object.assign(employee, changes)
      try {
        await employee.save()
        if (changes.email || changes.name) {
          await UserModel.updateOne({ _id: employee.userId }, {
            ...(changes.email ? { email: changes.email } : {}),
            ...(changes.name ? { name: changes.name } : {}),
          })
        }
      } catch (error) {
        Object.assign(employee, original)
        await employee.save().catch(() => {})
        if (originalUser) {
          await UserModel.updateOne({ _id: employee.userId }, { name: originalUser.name, email: originalUser.email }).catch(() => {})
        }
        if (error.code === 11000) throw Object.assign(new Error('Email already exists'), { status: 409 })
        throw error
      }
      return EmployeeModel.findById(id).populate('departmentId', 'name').lean()
    },

    async updateStatus(id, status) {
      if (!isObjectId(id)) throw Object.assign(new Error('Invalid employee ID'), { status: 400 })
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        throw Object.assign(new Error('Status must be ACTIVE or INACTIVE'), { status: 400, errors: [{ field: 'status', message: 'Status must be ACTIVE or INACTIVE' }] })
      }
      const employee = await EmployeeModel.findById(id)
      if (!employee) throw Object.assign(new Error('Employee not found'), { status: 404 })
      const oldStatus = employee.status
      const oldUserActive = await UserModel.findById(employee.userId).select('isActive').lean()
      if (!oldUserActive) throw Object.assign(new Error('Linked user not found'), { status: 404 })
      employee.status = status
      try {
        await employee.save()
        await UserModel.updateOne({ _id: employee.userId }, { isActive: status === 'ACTIVE' })
      } catch (error) {
        employee.status = oldStatus
        await employee.save().catch(() => {})
        await UserModel.updateOne({ _id: employee.userId }, { isActive: oldUserActive.isActive }).catch(() => {})
        throw error
      }
      return EmployeeModel.findById(id).populate('departmentId', 'name').lean()
    },
  }
}

export { isObjectId, validateEmployeeFields }

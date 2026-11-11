import mongoose from 'mongoose'

export class LeaveServiceError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.name = 'LeaveServiceError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

const fail = (message, errors = [], statusCode = 400) => {
  throw new LeaveServiceError(statusCode, message, errors)
}

function validDate(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('Validation failed', [`${fieldName} is required and must be a valid date.`])
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    fail('Validation failed', [`${fieldName} must be a valid date.`])
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number)
    const parsedAsUtc = new Date(Date.UTC(year, month - 1, day))
    if (
      parsedAsUtc.getUTCFullYear() !== year ||
      parsedAsUtc.getUTCMonth() !== month - 1 ||
      parsedAsUtc.getUTCDate() !== day
    ) {
      fail('Validation failed', [`${fieldName} must be a valid date.`])
    }
  }
  return date
}

function requireEmployeeId(employeeId) {
  if (!employeeId || !mongoose.isValidObjectId(employeeId)) {
    fail('Employee record not found', [], 404)
  }
  return employeeId
}

export function createLeaveService({ LeaveModel, EmployeeModel }) {
  return {
    async apply(user, input) {
      const employeeId = requireEmployeeId(user?.employeeId)
      const employee = await EmployeeModel.findById(employeeId)
      if (!employee) fail('Employee record not found', [], 404)

      const errors = []
      const leaveType = typeof input?.leaveType === 'string' ? input.leaveType.trim() : ''
      const reason = typeof input?.reason === 'string' ? input.reason.trim() : ''
      if (!leaveType) errors.push('leaveType is required.')
      if (!reason) errors.push('reason is required.')

      let startDate
      let endDate
      try {
        startDate = validDate(input?.startDate, 'startDate')
      } catch (error) {
        errors.push(...(error.errors ?? [error.message]))
      }
      try {
        endDate = validDate(input?.endDate, 'endDate')
      } catch (error) {
        errors.push(...(error.errors ?? [error.message]))
      }
      if (startDate && endDate && endDate < startDate) {
        errors.push('endDate must be on or after startDate.')
      }
      if (errors.length) fail('Validation failed', errors)

      return LeaveModel.create({
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason,
        status: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
      })
    },

    async listMine(user) {
      const employeeId = requireEmployeeId(user?.employeeId)
      const employee = await EmployeeModel.findById(employeeId)
      if (!employee) fail('Employee record not found', [], 404)

      return LeaveModel.find({ employeeId })
        .select('leaveType startDate endDate reason status reviewedBy reviewedAt')
        .populate({ path: 'reviewedBy', select: 'name email' })
        .sort({ createdAt: -1 })
        .lean()
    },

    async listAll() {
      return LeaveModel.find()
        .populate({
          path: 'employeeId',
          select: 'name email designation departmentId',
          populate: { path: 'departmentId', select: 'name' },
        })
        .populate({ path: 'reviewedBy', select: 'name email' })
        .sort({ createdAt: -1 })
        .lean()
    },

    async review(user, id, status) {
      if (!mongoose.isValidObjectId(id)) fail('Invalid leave ID', [], 400)
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        fail('Validation failed', ['status must be APPROVED or REJECTED.'])
      }
      if (!user?.id || !mongoose.isValidObjectId(user.id)) {
        fail('Authenticated user ID is missing or invalid', [], 401)
      }

      const leave = await LeaveModel.findById(id)
      if (!leave) fail('Leave request not found', [], 404)
      if (leave.status !== 'PENDING') {
        fail('Only pending leave requests can be reviewed', [], 409)
      }

      leave.status = status
      leave.reviewedBy = user.id
      leave.reviewedAt = new Date()
      await leave.save()
      return leave
    },
  }
}

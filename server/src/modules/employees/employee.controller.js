import { createEmployeeService } from './employee.service.js'

function success(res, message, data, status = 200) {
  return res.status(status).json({ success: true, message, data })
}

function failure(res, error) {
  const status = error.status || 500
  const errors = error.errors || []
  return res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong' : error.message,
    errors,
  })
}

function sanitizeResponse(value) {
  if (Array.isArray(value)) return value.map(sanitizeResponse)
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['password', 'passwordHash', 'temporaryPassword'].includes(key))
      .map(([key, nested]) => [key, sanitizeResponse(nested)]),
  )
}

function createResponseData(value) {
  const temporaryPassword = value?.temporaryPassword
  const data = sanitizeResponse(value)
  if (data && typeof data === 'object' && typeof temporaryPassword === 'string') {
    data.temporaryPassword = temporaryPassword
  }
  return data
}

function handle(action, message, status) {
  return async (req, res) => {
    try {
      const data = await action(req)
      return success(res, message, data, status)
    } catch (error) {
      return failure(res, error)
    }
  }
}

export function createEmployeeController({ hashPassword, service: injectedService }) {
  const service = injectedService || createEmployeeService({ hashPassword })
  const sanitized = (action) => async (req) => sanitizeResponse(await action(req))
  return {
    list: handle(sanitized((req) => service.list(req.query)), 'Employees retrieved successfully'),
    create: async (req, res) => {
      try {
        const data = await service.create(req.body || {})
        return success(res, 'Employee created successfully', createResponseData(data), 201)
      } catch (error) {
        return failure(res, error)
      }
    },
    getById: handle(sanitized((req) => service.getById(req.params.id)), 'Employee retrieved successfully'),
    getMe: handle(sanitized((req) => service.getMe(req.user?.employeeId)), 'Employee profile retrieved successfully'),
    update: handle(sanitized((req) => service.update(req.params.id, req.body || {})), 'Employee updated successfully'),
    updateStatus: handle(sanitized((req) => service.updateStatus(req.params.id, req.body?.status)), 'Employee status updated successfully'),
  }
}

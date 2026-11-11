import Department from '../../shared/models/Department.js'
import Employee from '../../shared/models/Employee.js'
import { createDepartmentService, DepartmentError } from './departmentService.js'

const service = createDepartmentService({ Department, Employee })

function sendError(response, error) {
  const statusCode = error instanceof DepartmentError ? error.statusCode : 500
  const message = statusCode === 500 ? 'Something went wrong.' : error.message
  const errors = error instanceof DepartmentError ? error.errors : []
  response.status(statusCode).json({ success: false, message, errors })
}

function createHandler(operation, successMessage, statusCode = 200) {
  return async (request, response) => {
    try {
      const data = await operation(request)
      response.status(statusCode).json({
        success: true,
        message: successMessage,
        data,
      })
    } catch (error) {
      sendError(response, error)
    }
  }
}

export const listDepartments = createHandler(
  () => service.list(),
  'Departments retrieved successfully.',
)

export const createDepartment = createHandler(
  (request) => service.create(request.body),
  'Department created successfully.',
  201,
)

export const updateDepartment = createHandler(
  (request) => service.update(request.params.id, request.body),
  'Department updated successfully.',
)

export const deleteDepartment = createHandler(
  (request) => service.remove(request.params.id),
  'Department deleted successfully.',
)

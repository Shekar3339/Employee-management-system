import { Router } from 'express'
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from './departmentController.js'

// The owning app supplies the shared authentication middleware at integration time.
export function createDepartmentRouter({ authenticate, authorize }) {
  if (typeof authenticate !== 'function' || typeof authorize !== 'function') {
    throw new TypeError('Department routes require shared authenticate and authorize middleware.')
  }

  const router = Router()
  router.get('/', authenticate, authorize('ADMIN', 'EMPLOYEE'), listDepartments)
  router.post('/', authenticate, authorize('ADMIN'), createDepartment)
  router.put('/:id', authenticate, authorize('ADMIN'), updateDepartment)
  router.delete('/:id', authenticate, authorize('ADMIN'), deleteDepartment)
  return router
}

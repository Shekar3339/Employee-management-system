import { Router } from 'express'
import { createEmployeeController } from './employee.controller.js'

// The application owner can mount this router at /api/employees after supplying
// the shared authentication, authorization, and password hashing utilities.
export function createEmployeeRouter({ authenticate, authorize, hashPassword, service }) {
  if (typeof authenticate !== 'function' || typeof authorize !== 'function') {
    throw new TypeError('Employee routes require the shared authenticate and authorize middleware.')
  }
  const controller = createEmployeeController({ hashPassword, service })
  const router = Router()

  router.get('/me', authenticate, authorize('EMPLOYEE'), controller.getMe)
  router.get('/', authenticate, authorize('ADMIN'), controller.list)
  router.post('/', authenticate, authorize('ADMIN'), controller.create)
  router.get('/:id', authenticate, authorize('ADMIN'), controller.getById)
  router.put('/:id', authenticate, authorize('ADMIN'), controller.update)
  router.patch('/:id/status', authenticate, authorize('ADMIN'), controller.updateStatus)

  return router
}

import { Router } from 'express'
import { Employee, Leave } from '../../shared/models/index.js'
import { authenticate, authorize } from '../../shared/middleware/auth.js'
import { createLeaveController } from './leaveController.js'
import { createLeaveService } from './leaveService.js'

export function createLeaveRouter({
  authenticateMiddleware = authenticate,
  authorizeMiddleware = authorize,
  LeaveModel = Leave,
  EmployeeModel = Employee,
} = {}) {
  const router = Router()
  const controller = createLeaveController(
    createLeaveService({ LeaveModel, EmployeeModel }),
  )

  router.post('/', authenticateMiddleware, authorizeMiddleware('EMPLOYEE'), controller.apply)
  router.get('/mine', authenticateMiddleware, authorizeMiddleware('EMPLOYEE'), controller.listMine)
  router.get('/', authenticateMiddleware, authorizeMiddleware('ADMIN'), controller.listAll)
  router.patch('/:id/status', authenticateMiddleware, authorizeMiddleware('ADMIN'), controller.review)

  return router
}

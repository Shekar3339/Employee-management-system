import { Router } from 'express'
import {
  Attendance,
  AttendanceCorrection,
  AttendanceHoliday,
  Employee,
  Leave,
} from '../../shared/models/index.js'
import { authenticate, authorize } from '../../shared/middleware/auth.js'
import { createAttendanceController } from './attendanceController.js'
import { createAttendanceService } from './attendanceService.js'

export function createAttendanceRouter({
  authenticateMiddleware = authenticate,
  authorizeMiddleware = authorize,
  models = {},
  service,
} = {}) {
  const router = Router()
  const attendanceService = service || createAttendanceService({
    models: {
      Attendance: models.Attendance || Attendance,
      AttendanceCorrection: models.AttendanceCorrection || AttendanceCorrection,
      AttendanceHoliday: models.AttendanceHoliday || AttendanceHoliday,
      Employee: models.Employee || Employee,
      Leave: models.Leave || Leave,
    },
  })
  const controller = createAttendanceController(attendanceService)
  const employee = [authenticateMiddleware, authorizeMiddleware('EMPLOYEE')]
  const admin = [authenticateMiddleware, authorizeMiddleware('ADMIN')]

  router.post('/check-in', ...employee, controller.checkIn)
  router.post('/check-out', ...employee, controller.checkOut)
  router.get('/mine', ...employee, controller.listMine)
  router.post('/mine/corrections', ...employee, controller.createCorrection)
  router.get('/mine/corrections', ...employee, controller.listMyCorrections)
  router.get('/corrections', ...admin, controller.listCorrections)
  router.patch('/corrections/:correctionId', ...admin, controller.reviewCorrection)
  router.get('/reports/summary', ...admin, controller.getSummary)
  router.get('/holidays', ...admin, controller.listHolidays)
  router.post('/holidays', ...admin, controller.createHoliday)
  router.put('/holidays/:holidayId', ...admin, controller.updateHoliday)
  router.delete('/holidays/:holidayId', ...admin, controller.deleteHoliday)
  router.get('/', ...admin, controller.listAll)

  return router
}

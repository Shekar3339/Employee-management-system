import { AttendanceServiceError } from './attendanceService.js'

const success = (response, status, message, data) =>
  response.status(status).json({ success: true, message, data })

function failure(response, error) {
  if (error instanceof AttendanceServiceError) {
    return response.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
    })
  }
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    const errors = error.errors
      ? Object.values(error.errors).map((item) => item.message)
      : [error.message]
    return response.status(400).json({ success: false, message: 'Validation failed', errors })
  }
  return response.status(500).json({
    success: false,
    message: 'Something went wrong',
    errors: [],
  })
}

function endpoint(action, { status = 200, message }) {
  return async (request, response) => {
    try {
      const data = await action(request)
      return success(response, status, message, data)
    } catch (error) {
      return failure(response, error)
    }
  }
}

export function createAttendanceController(service) {
  return {
    checkIn: endpoint((request) => service.checkIn(request.user, request.body), {
      status: 201,
      message: 'Attendance check-in recorded.',
    }),
    checkOut: endpoint((request) => service.checkOut(request.user, request.body), {
      message: 'Attendance check-out recorded.',
    }),
    listMine: endpoint((request) => service.listMine(request.user, request.query), {
      message: 'Attendance history retrieved.',
    }),
    createCorrection: endpoint((request) => service.createCorrection(request.user, request.body), {
      status: 201,
      message: 'Correction request submitted.',
    }),
    listMyCorrections: endpoint((request) => service.listMyCorrections(request.user, request.query), {
      message: 'Correction history retrieved.',
    }),
    listAll: endpoint((request) => service.listAll(request.query), {
      message: 'Attendance records retrieved.',
    }),
    listCorrections: endpoint((request) => service.listCorrections(request.query), {
      message: 'Correction requests retrieved.',
    }),
    reviewCorrection: endpoint((request) => service.reviewCorrection(
      request.user,
      request.params.correctionId,
      request.body,
    ), {
      message: 'Correction request reviewed.',
    }),
    getSummary: endpoint((request) => service.getSummary(request.query), {
      message: 'Attendance summary retrieved.',
    }),
    listHolidays: endpoint((request) => service.listHolidays(request.query), {
      message: 'Attendance holidays retrieved.',
    }),
    createHoliday: endpoint((request) => service.createHoliday(request.body), {
      status: 201,
      message: 'Attendance holiday created.',
    }),
    updateHoliday: endpoint((request) => service.updateHoliday(request.params.holidayId, request.body), {
      message: 'Attendance holiday updated.',
    }),
    deleteHoliday: endpoint((request) => service.deleteHoliday(request.params.holidayId), {
      message: 'Attendance holiday deleted.',
    }),
  }
}

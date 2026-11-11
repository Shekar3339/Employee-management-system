import mongoose from 'mongoose'
import {
  Attendance,
  AttendanceCorrection,
  AttendanceHoliday,
  Employee,
  Leave,
} from '../../shared/models/index.js'

const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'INCOMPLETE']
const CORRECTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED']
const CORRECTION_WINDOW_DAYS = 7
const MAX_REPORT_DAYS = 366

export class AttendanceServiceError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message)
    this.name = 'AttendanceServiceError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

const fail = (statusCode, message, errors = []) => {
  throw new AttendanceServiceError(statusCode, message, errors)
}

function isValidWorkDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function dateOffset(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function dayDifference(later, earlier) {
  return (Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) / 86400000
}

function validId(value) {
  return Boolean(value && mongoose.isValidObjectId(value))
}

function duplicateKey(error) {
  return error?.code === 11000
}

function parsePage(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25))
  return { page, limit }
}

function validateDateFilters(query, { required = false } = {}) {
  const from = query.from || ''
  const to = query.to || ''
  if (required && (!from || !to)) fail(400, 'Both from and to dates are required.')
  if ((from && !isValidWorkDate(from)) || (to && !isValidWorkDate(to))) {
    fail(400, 'Dates must use the YYYY-MM-DD format.')
  }
  if (from && to && from > to) fail(400, 'The from date must be on or before the to date.')
  if (required && dayDifference(to, from) >= MAX_REPORT_DAYS) {
    fail(400, `The report range cannot exceed ${MAX_REPORT_DAYS} days.`)
  }
  return { from, to }
}

function parseNotes(value) {
  if (value === undefined) return ''
  if (typeof value !== 'string') fail(400, 'Notes must be a string.')
  const notes = value.trim()
  if (notes.length > 500) fail(400, 'Notes cannot exceed 500 characters.')
  return notes
}

function parseInstant(value, field) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    fail(400, `${field} must be an ISO timestamp with a timezone offset.`)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) fail(400, `${field} must be a valid timestamp.`)
  return date
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

export function createAttendanceService({
  models = {},
  database = mongoose,
  timeZone = 'Asia/Kolkata',
  shiftStart = process.env.ATTENDANCE_SHIFT_START || '09:00',
  graceMinutes = Number(process.env.ATTENDANCE_GRACE_MINUTES || 15),
  clock = () => new Date(),
} = {}) {
  const {
    Attendance: AttendanceModel = Attendance,
    AttendanceCorrection: CorrectionModel = AttendanceCorrection,
    AttendanceHoliday: HolidayModel = AttendanceHoliday,
    Employee: EmployeeModel = Employee,
    Leave: LeaveModel = Leave,
  } = models

  try {
    new Intl.DateTimeFormat('en', { timeZone })
  } catch {
    throw new TypeError(`Invalid attendance time zone: ${timeZone}`)
  }

  if (!/^\d{2}:\d{2}$/.test(shiftStart)) {
    throw new TypeError('Attendance shift start must use HH:mm.')
  }
  const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number)
  if (shiftHour > 23 || shiftMinute > 59 || !Number.isFinite(graceMinutes) || graceMinutes < 0) {
    throw new TypeError('Attendance shift start or grace period is invalid.')
  }

  function localParts(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value)
    return Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  }

  function workDateFor(value) {
    const parts = localParts(value)
    return `${parts.year}-${parts.month}-${parts.day}`
  }

  function isLate(value) {
    const parts = localParts(value)
    const checkInSeconds = Number(parts.hour) * 3600
      + Number(parts.minute) * 60
      + Number(parts.second)
    const lateAfterSeconds = (shiftHour * 60 + shiftMinute + graceMinutes) * 60
    return checkInSeconds > lateAfterSeconds
  }

  function validateEmployee(user) {
    if (!validId(user?.employeeId)) fail(404, 'Employee record not found.')
    return user.employeeId
  }

  async function ensureEmployee(user) {
    const employeeId = validateEmployee(user)
    if (!(await EmployeeModel.exists({ _id: employeeId }))) {
      fail(404, 'Employee record not found.')
    }
    return employeeId
  }

  function validateCorrectionTimes(workDate, checkInAt, checkOutAt) {
    const checkInDate = workDateFor(checkInAt)
    if (checkInDate !== workDate) {
      fail(400, 'Check-in time must fall on the requested work date in the organization timezone.')
    }
    const checkOutDate = workDateFor(checkOutAt)
    if (checkOutDate !== workDate && checkOutDate !== dateOffset(workDate, 1)) {
      fail(400, 'Check-out time must fall on the work date or the following local date.')
    }
    if (checkOutAt < checkInAt) fail(400, 'Check-out time must be after check-in time.')
  }

  async function listAttendance(filter, query) {
    const { page, limit } = parsePage(query)
    const statusFilter = filter.status
    const databaseFilter = { ...filter }
    delete databaseFilter.status
    const today = workDateFor(clock())
    if (statusFilter === 'INCOMPLETE') {
      databaseFilter.checkOutAt = null
      databaseFilter.workDate = {
        ...(databaseFilter.workDate || {}),
        $lt: today,
      }
    } else if (statusFilter) {
      databaseFilter.status = statusFilter
      databaseFilter.$and = [
        ...(databaseFilter.$and || []),
        { $or: [{ checkOutAt: { $ne: null } }, { workDate: { $gte: today } }] },
      ]
    }
    const [attendance, total] = await Promise.all([
      AttendanceModel.find(databaseFilter)
        .populate({
          path: 'employeeId',
          select: 'name email designation departmentId',
          populate: { path: 'departmentId', select: 'name' },
        })
        .sort({ workDate: -1, checkInAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .then((records) => records.map((record) => (
          !record.checkOutAt && record.workDate < today
            ? { ...record, status: 'INCOMPLETE' }
            : record
        ))),
      AttendanceModel.countDocuments(databaseFilter),
    ])
    return { attendance, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  }

  async function listCorrections(filter, query) {
    const { page, limit } = parsePage(query)
    const [corrections, total] = await Promise.all([
      CorrectionModel.find(filter)
        .populate({
          path: 'employeeId',
          select: 'name email designation departmentId',
          populate: { path: 'departmentId', select: 'name' },
        })
        .populate({ path: 'reviewedBy', select: 'name email' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CorrectionModel.countDocuments(filter),
    ])
    return { corrections, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
  }

  return {
    async checkIn(user, input = {}) {
      const employeeId = await ensureEmployee(user)
      const checkedInAt = clock()
      const workDate = workDateFor(checkedInAt)
      const notes = parseNotes(input.notes)

      if (await AttendanceModel.findOne({ employeeId, checkOutAt: null })) {
        fail(409, 'Check out of your current attendance before checking in again.')
      }
      if (await AttendanceModel.findOne({ employeeId, workDate })) {
        fail(409, 'An attendance record already exists for today.')
      }

      try {
        return await AttendanceModel.create({
          employeeId,
          workDate,
          checkInAt: checkedInAt,
          checkOutAt: null,
          workDurationMinutes: null,
          status: isLate(checkedInAt) ? 'LATE' : 'PRESENT',
          notes,
        })
      } catch (error) {
        if (duplicateKey(error)) fail(409, 'An attendance record already exists for today.')
        throw error
      }
    },

    async checkOut(user, input = {}) {
      const employeeId = await ensureEmployee(user)
      const checkedOutAt = clock()
      const notes = parseNotes(input.notes)
      const attendance = await AttendanceModel.findOne({ employeeId, checkOutAt: null })
        .sort({ workDate: -1 })
      if (!attendance) fail(409, 'There is no open attendance record to check out.')
      if (checkedOutAt < attendance.checkInAt) fail(400, 'Check-out time cannot be before check-in time.')

      attendance.checkOutAt = checkedOutAt
      attendance.workDurationMinutes = Math.floor((checkedOutAt - attendance.checkInAt) / 60000)
      if (notes) attendance.notes = [attendance.notes, notes].filter(Boolean).join('\n')
      await attendance.save()
      return attendance
    },

    async listMine(user, query = {}) {
      const employeeId = await ensureEmployee(user)
      const { from, to } = validateDateFilters(query)
      const filter = { employeeId }
      if (from || to) filter.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
      if (query.status) {
        if (!ATTENDANCE_STATUSES.includes(query.status)) fail(400, 'Invalid attendance status.')
        filter.status = query.status
      }
      return listAttendance(filter, query)
    },

    async listAll(query = {}) {
      const { from, to } = validateDateFilters(query)
      const filter = {}
      if (from || to) filter.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
      if (query.status) {
        if (!ATTENDANCE_STATUSES.includes(query.status)) fail(400, 'Invalid attendance status.')
        filter.status = query.status
      }
      if (query.employeeId) {
        if (!validId(query.employeeId)) fail(400, 'Invalid employee ID.')
        filter.$and = [...(filter.$and || []), { employeeId: query.employeeId }]
      }
      if (query.departmentId) {
        if (!validId(query.departmentId)) fail(400, 'Invalid department ID.')
        const employees = await EmployeeModel.find({ departmentId: query.departmentId }).select('_id').lean()
        const employeeIds = employees.map(({ _id }) => _id)
        filter.$and = [...(filter.$and || []), { employeeId: { $in: employeeIds } }]
      }
      return listAttendance(filter, query)
    },

    async createCorrection(user, input = {}) {
      const employeeId = await ensureEmployee(user)
      const { workDate } = input
      if (!isValidWorkDate(workDate)) fail(400, 'workDate must be a valid YYYY-MM-DD date.')
      const now = clock()
      const today = workDateFor(now)
      const age = dayDifference(today, workDate)
      if (age < 0) fail(400, 'Corrections cannot be requested for a future date.')
      if (age > CORRECTION_WINDOW_DAYS) {
        fail(400, `Corrections must be requested within ${CORRECTION_WINDOW_DAYS} calendar days.`)
      }
      const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
      if (!reason) fail(400, 'A reason is required for an attendance correction.')
      if (reason.length > 500) fail(400, 'Correction reason cannot exceed 500 characters.')

      const existing = await AttendanceModel.findOne({ employeeId, workDate })
      const requestedCheckInAt = hasValue(input.checkInAt)
        ? parseInstant(input.checkInAt, 'checkInAt')
        : existing?.checkInAt || null
      const requestedCheckOutAt = hasValue(input.checkOutAt)
        ? parseInstant(input.checkOutAt, 'checkOutAt')
        : existing?.checkOutAt || null
      if (!requestedCheckInAt) fail(400, 'A check-in time is required for the corrected attendance.')
      if (requestedCheckInAt > now || (requestedCheckOutAt && requestedCheckOutAt > now)) {
        fail(400, 'Correction times cannot be in the future.')
      }
      if (requestedCheckOutAt) {
        validateCorrectionTimes(workDate, requestedCheckInAt, requestedCheckOutAt)
      } else if (workDateFor(requestedCheckInAt) !== workDate) {
        fail(400, 'Check-in time must fall on the requested work date in the organization timezone.')
      }

      if (await CorrectionModel.findOne({ employeeId, workDate, status: 'PENDING' })) {
        fail(409, 'A correction request is already pending for this date.')
      }

      try {
        return await CorrectionModel.create({
          attendanceId: existing?._id || null,
          employeeId,
          workDate,
          requestedCheckInAt,
          requestedCheckOutAt,
          reason,
          status: 'PENDING',
          before: {
            checkInAt: existing?.checkInAt || null,
            checkOutAt: existing?.checkOutAt || null,
          },
          after: {
            checkInAt: requestedCheckInAt,
            checkOutAt: requestedCheckOutAt,
          },
        })
      } catch (error) {
        if (duplicateKey(error)) fail(409, 'A correction request is already pending for this date.')
        throw error
      }
    },

    async listMyCorrections(user, query = {}) {
      const employeeId = await ensureEmployee(user)
      const { from, to } = validateDateFilters(query)
      const filter = { employeeId }
      if (from || to) filter.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
      if (query.status) {
        if (!CORRECTION_STATUSES.includes(query.status)) fail(400, 'Invalid correction status.')
        filter.status = query.status
      }
      return listCorrections(filter, query)
    },

    async listCorrections(query = {}) {
      const { from, to } = validateDateFilters(query)
      const filter = {}
      if (from || to) filter.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
      if (query.status) {
        if (!CORRECTION_STATUSES.includes(query.status)) fail(400, 'Invalid correction status.')
        filter.status = query.status
      }
      return listCorrections(filter, query)
    },

    async reviewCorrection(user, id, input = {}) {
      if (!validId(id)) fail(400, 'Invalid correction ID.')
      if (!['APPROVED', 'REJECTED'].includes(input.decision)) {
        fail(400, 'Decision must be APPROVED or REJECTED.')
      }
      if (!validId(user?.id)) fail(401, 'Authenticated user ID is missing or invalid.')
      const reviewNote = typeof input.reviewNote === 'string' ? input.reviewNote.trim() : ''
      if (reviewNote.length > 500) fail(400, 'Review note cannot exceed 500 characters.')

      const session = await database.startSession()
      let reviewedCorrection
      try {
        await session.withTransaction(async () => {
          const correction = await CorrectionModel.findById(id).session(session)
          if (!correction) fail(404, 'Correction request not found.')
          if (correction.status !== 'PENDING') fail(409, 'Only pending correction requests can be reviewed.')

          if (input.decision === 'APPROVED') {
            const attendance = await AttendanceModel.findOne({
              employeeId: correction.employeeId,
              workDate: correction.workDate,
            }).session(session)
            const checkInAt = correction.requestedCheckInAt || attendance?.checkInAt
            const checkOutAt = correction.requestedCheckOutAt || null
            if (!checkInAt) fail(400, 'A check-in time is required for the corrected attendance.')
            if (checkOutAt) validateCorrectionTimes(correction.workDate, checkInAt, checkOutAt)

            const status = isLate(checkInAt) ? 'LATE' : 'PRESENT'
            let target = attendance
            if (!target) {
              [target] = await AttendanceModel.create([{
                employeeId: correction.employeeId,
                workDate: correction.workDate,
                checkInAt,
                checkOutAt,
                workDurationMinutes: checkOutAt
                  ? Math.floor((checkOutAt - checkInAt) / 60000)
                  : null,
                status,
                notes: `Correction approved: ${correction.reason}`,
              }], { session })
            } else {
              correction.before = {
                checkInAt: attendance.checkInAt,
                checkOutAt: attendance.checkOutAt,
              }
              attendance.checkInAt = checkInAt
              attendance.checkOutAt = checkOutAt
              attendance.workDurationMinutes = checkOutAt
                ? Math.floor((checkOutAt - checkInAt) / 60000)
                : null
              attendance.status = status
              await attendance.save({ session })
            }
            correction.attendanceId = target._id
          }

          correction.status = input.decision
          correction.reviewedBy = user.id
          correction.reviewedAt = clock()
          correction.reviewNote = reviewNote
          correction.after = {
            checkInAt: correction.requestedCheckInAt,
            checkOutAt: correction.requestedCheckOutAt,
          }
          await correction.save({ session })
          reviewedCorrection = correction
        })
      } finally {
        await session.endSession()
      }
      return reviewedCorrection
    },

    async listHolidays(query = {}) {
      const { from, to } = validateDateFilters(query)
      const filter = {}
      if (from || to) filter.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
      return HolidayModel.find(filter).sort({ workDate: 1 }).lean()
    },

    async createHoliday(input = {}) {
      if (!isValidWorkDate(input.workDate)) fail(400, 'workDate must be a valid YYYY-MM-DD date.')
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      const description = typeof input.description === 'string' ? input.description.trim() : ''
      if (!name) fail(400, 'Holiday name is required.')
      if (name.length > 120) fail(400, 'Holiday name cannot exceed 120 characters.')
      if (description.length > 500) fail(400, 'Holiday description cannot exceed 500 characters.')
      try {
        return await HolidayModel.create({ workDate: input.workDate, name, description })
      } catch (error) {
        if (duplicateKey(error)) fail(409, 'A holiday is already configured for this date.')
        throw error
      }
    },

    async updateHoliday(id, input = {}) {
      if (!validId(id)) fail(400, 'Invalid holiday ID.')
      if (!isValidWorkDate(input.workDate)) fail(400, 'workDate must be a valid YYYY-MM-DD date.')
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      const description = typeof input.description === 'string' ? input.description.trim() : ''
      if (!name) fail(400, 'Holiday name is required.')
      if (name.length > 120) fail(400, 'Holiday name cannot exceed 120 characters.')
      if (description.length > 500) fail(400, 'Holiday description cannot exceed 500 characters.')
      try {
        const holiday = await HolidayModel.findById(id)
        if (!holiday) fail(404, 'Holiday not found.')
        holiday.workDate = input.workDate
        holiday.name = name
        holiday.description = description
        await holiday.save()
        return holiday
      } catch (error) {
        if (duplicateKey(error)) fail(409, 'A holiday is already configured for this date.')
        throw error
      }
    },

    async deleteHoliday(id) {
      if (!validId(id)) fail(400, 'Invalid holiday ID.')
      const holiday = await HolidayModel.findByIdAndDelete(id)
      if (!holiday) fail(404, 'Holiday not found.')
      return holiday
    },

    async getSummary(query = {}) {
      const { from, to } = validateDateFilters(query, { required: true })
      if (to > workDateFor(clock())) fail(400, 'The report end date cannot be in the future.')
      const employeeFilter = { status: 'ACTIVE' }
      if (query.departmentId) {
        if (!validId(query.departmentId)) fail(400, 'Invalid department ID.')
        employeeFilter.departmentId = query.departmentId
      }
      if (query.employeeId) {
        if (!validId(query.employeeId)) fail(400, 'Invalid employee ID.')
        employeeFilter._id = query.employeeId
      }
      const dateFilter = { workDate: { $gte: from, $lte: to } }
      const [employees, attendance, holidays, leaves] = await Promise.all([
        EmployeeModel.find(employeeFilter).select('_id').lean(),
        AttendanceModel.find(dateFilter).lean(),
        HolidayModel.find(dateFilter).select('workDate').lean(),
        LeaveModel.find({
          status: 'APPROVED',
          startDate: { $lte: new Date(`${dateOffset(to, 1)}T23:59:59.999Z`) },
          endDate: { $gte: new Date(`${dateOffset(from, -1)}T00:00:00.000Z`) },
        }).select('employeeId startDate endDate').lean(),
      ])
      const employeeIds = new Set(employees.map((employee) => String(employee._id)))
      const attendanceByDay = new Map(
        attendance
          .filter((record) => employeeIds.has(String(record.employeeId)))
          .map((record) => [`${record.employeeId}:${record.workDate}`, record]),
      )
      const holidayDates = new Set(holidays.map((holiday) => holiday.workDate))
      const leaveDays = new Set()
      for (const leave of leaves) {
        const employeeId = String(leave.employeeId)
        if (!employeeIds.has(employeeId)) continue
        let leaveDate = workDateFor(leave.startDate)
        const lastLeaveDate = workDateFor(leave.endDate)
        while (leaveDate <= lastLeaveDate) {
          if (leaveDate >= from && leaveDate <= to) leaveDays.add(`${employeeId}:${leaveDate}`)
          leaveDate = dateOffset(leaveDate, 1)
        }
      }

      const today = workDateFor(clock())
      const result = {
        from,
        to,
        employees: employees.length,
        scheduledWorkdays: 0,
        present: 0,
        late: 0,
        incomplete: 0,
        absent: 0,
        onLeave: 0,
        holidayDates: holidayDates.size,
        workedOnNonWorkingDay: 0,
        totalWorkDurationMinutes: 0,
      }

      for (const record of attendance) {
        if (!employeeIds.has(String(record.employeeId))) continue
        result.present += 1
        if (record.status === 'LATE') result.late += 1
        if (!record.checkOutAt && record.workDate < today) result.incomplete += 1
        result.totalWorkDurationMinutes += record.workDurationMinutes || 0
      }

      for (let date = from; date <= to; date = dateOffset(date, 1)) {
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay()
        const nonWorkingDay = weekday === 0 || weekday === 6 || holidayDates.has(date)
        for (const employeeId of employeeIds) {
          const key = `${employeeId}:${date}`
          const record = attendanceByDay.get(key)
          if (nonWorkingDay) {
            if (record) result.workedOnNonWorkingDay += 1
            continue
          }
          result.scheduledWorkdays += 1
          if (leaveDays.has(key)) {
            result.onLeave += 1
            continue
          }
          if (!record) {
            if (date < today) result.absent += 1
          }
        }
      }
      return result
    },
  }
}

export { isValidWorkDate }

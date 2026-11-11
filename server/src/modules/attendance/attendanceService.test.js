import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { createAttendanceService, AttendanceServiceError } from './attendanceService.js'

const employeeId = new mongoose.Types.ObjectId().toString()
const adminId = new mongoose.Types.ObjectId().toString()

function matches(document, filter = {}) {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (!condition.every((item) => matches(document, item))) return false
      continue
    }
    if (key === '$or') {
      if (!condition.some((item) => matches(document, item))) return false
      continue
    }
    const actual = document[key]
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('$in' in condition && !condition.$in.some((value) => String(value) === String(actual))) return false
      if ('$gte' in condition && !(actual >= condition.$gte)) return false
      if ('$lte' in condition && !(actual <= condition.$lte)) return false
      if ('$lt' in condition && !(actual < condition.$lt)) return false
      if ('$ne' in condition && actual === condition.$ne) return false
      if (!Object.keys(condition).some((operator) => operator.startsWith('$')) && String(actual) !== String(condition)) return false
    } else if (String(actual) !== String(condition)) {
      return false
    }
  }
  return true
}

function query(value) {
  return {
    select() { return this },
    populate() { return this },
    sort() { return this },
    skip() { return this },
    limit() { return this },
    session() { return this },
    lean() { return Promise.resolve(value) },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) },
  }
}

function memoryCollection(initial = []) {
  const documents = initial
  const save = async function save() {
    if (!documents.includes(this)) documents.push(this)
    return this
  }
  const createOne = (data) => ({ _id: new mongoose.Types.ObjectId(), ...data, save })
  return {
    documents,
    create: async (data) => {
      if (Array.isArray(data)) {
        return data.map((item) => {
          const created = createOne(item)
          documents.push(created)
          return created
        })
      }
      const created = createOne(data)
      documents.push(created)
      return created
    },
    findOne: (filter) => query(documents.find((document) => matches(document, filter)) || null),
    findById: (id) => query(documents.find((document) => String(document._id) === String(id)) || null),
    findByIdAndDelete: async (id) => {
      const index = documents.findIndex((document) => String(document._id) === String(id))
      return index < 0 ? null : documents.splice(index, 1)[0]
    },
    find: (filter) => query(documents.filter((document) => matches(document, filter))),
    countDocuments: async (filter) => documents.filter((document) => matches(document, filter)).length,
  }
}

function createTestService({ now = '2026-11-11T03:45:00.000Z', attendance = [], corrections = [], holidays = [], employees, leaves } = {}) {
  let currentTime = new Date(now)
  const employeeRows = employees || [{ _id: employeeId, status: 'ACTIVE' }]
  const AttendanceModel = memoryCollection(attendance)
  const AttendanceCorrectionModel = memoryCollection(corrections)
  const AttendanceHolidayModel = memoryCollection(holidays)
  const EmployeeModel = {
    exists: async ({ _id }) => employeeRows.some((employee) => String(employee._id) === String(_id)),
    find: (filter) => query(employeeRows.filter((employee) => matches(employee, filter))),
  }
  const LeaveModel = {
    find: (filter) => query((leaves || []).filter((leave) => matches(leave, filter))),
  }
  const database = {
    startSession: async () => ({
      withTransaction: async (callback) => callback(),
      endSession: async () => {},
    }),
  }
  const service = createAttendanceService({
    models: {
      Attendance: AttendanceModel,
      AttendanceCorrection: AttendanceCorrectionModel,
      AttendanceHoliday: AttendanceHolidayModel,
      Employee: EmployeeModel,
      Leave: LeaveModel,
    },
    database,
    clock: () => new Date(currentTime),
  })
  return {
    service,
    AttendanceModel,
    AttendanceCorrectionModel,
    AttendanceHolidayModel,
    setTime(value) { currentTime = new Date(value) },
  }
}

test('check-in uses Asia/Kolkata work date and allows the 09:15 grace cutoff', async () => {
  const { service, AttendanceModel } = createTestService()
  const result = await service.checkIn({ employeeId })
  assert.equal(result.workDate, '2026-11-11')
  assert.equal(result.status, 'PRESENT')
  assert.equal(AttendanceModel.documents.length, 1)
  await assert.rejects(
    service.checkIn({ employeeId }),
    (error) => error instanceof AttendanceServiceError && error.statusCode === 409,
  )
})

test('check-in after the 09:15 grace cutoff is marked late', async () => {
  const { service } = createTestService({ now: '2026-11-11T03:46:00.000Z' })
  const result = await service.checkIn({ employeeId })
  assert.equal(result.status, 'LATE')
})

test('check-in seconds after the grace cutoff are marked late', async () => {
  const { service } = createTestService({ now: '2026-11-11T03:45:30.000Z' })
  const result = await service.checkIn({ employeeId })
  assert.equal(result.status, 'LATE')
})

test('check-out computes elapsed minutes and appends optional notes', async () => {
  const { service, setTime } = createTestService()
  const attendance = await service.checkIn({ employeeId }, { notes: 'Started early' })
  setTime('2026-11-11T11:15:00.000Z')
  const result = await service.checkOut({ employeeId }, { notes: 'Leaving now' })
  assert.equal(result._id, attendance._id)
  assert.equal(result.workDurationMinutes, 450)
  assert.equal(result.notes, 'Started early\nLeaving now')
})

test('check-out without an open check-in is rejected', async () => {
  const { service } = createTestService()
  await assert.rejects(
    service.checkOut({ employeeId }),
    (error) => error instanceof AttendanceServiceError && error.statusCode === 409,
  )
})

test('correction approval creates attendance and records before/after audit values', async () => {
  const { service, AttendanceModel, AttendanceCorrectionModel } = createTestService({
    now: '2026-11-11T12:00:00.000Z',
  })
  const correction = await service.createCorrection({ employeeId }, {
    workDate: '2026-11-11',
    checkInAt: '2026-11-11T09:10:00+05:30',
    checkOutAt: '2026-11-11T17:00:00+05:30',
    reason: 'Forgot to check in',
  })
  assert.equal(correction.status, 'PENDING')
  const reviewed = await service.reviewCorrection({ id: adminId }, correction._id, {
    decision: 'APPROVED',
    reviewNote: 'Verified with manager',
  })
  assert.equal(reviewed.status, 'APPROVED')
  assert.equal(reviewed.reviewedBy, adminId)
  assert.equal(reviewed.before.checkInAt, null)
  assert.equal(reviewed.after.checkInAt.toISOString(), '2026-11-11T03:40:00.000Z')
  assert.equal(AttendanceModel.documents.length, 1)
  assert.equal(AttendanceModel.documents[0].workDurationMinutes, 470)
  assert.equal(AttendanceCorrectionModel.documents[0].reviewNote, 'Verified with manager')
})

test('correction requests are limited to seven days and reject invalid timestamps', async () => {
  const { service } = createTestService()
  const oldDate = await assert.rejects(
    service.createCorrection({ employeeId }, {
      workDate: '2026-11-03',
      checkInAt: '2026-11-03T09:00:00+05:30',
      reason: 'Missed punch',
    }),
    (error) => error instanceof AttendanceServiceError && error.statusCode === 400,
  )
  assert.equal(oldDate, undefined)
  await assert.rejects(
    service.createCorrection({ employeeId }, {
      workDate: '2026-11-11',
      checkInAt: '2026-11-11T09:00:00',
      reason: 'Missed punch',
    }),
    /timezone offset/,
  )
})

test('rejected corrections preserve the original attendance and pending requests cannot duplicate', async () => {
  const existing = {
    _id: new mongoose.Types.ObjectId(),
    employeeId,
    workDate: '2026-11-11',
    checkInAt: new Date('2026-11-11T03:30:00.000Z'),
    checkOutAt: new Date('2026-11-11T11:30:00.000Z'),
    status: 'PRESENT',
  }
  const { service, AttendanceCorrectionModel } = createTestService({
    attendance: [existing],
    now: '2026-11-11T12:00:00.000Z',
  })
  const input = {
    workDate: '2026-11-11',
    checkOutAt: '2026-11-11T17:15:00+05:30',
    reason: 'Correct missed checkout',
  }
  const correction = await service.createCorrection({ employeeId }, input)
  await assert.rejects(
    service.createCorrection({ employeeId }, input),
    (error) => error instanceof AttendanceServiceError && error.statusCode === 409,
  )
  const rejected = await service.reviewCorrection({ id: adminId }, correction._id, { decision: 'REJECTED' })
  assert.equal(rejected.status, 'REJECTED')
  assert.equal(existing.checkOutAt.toISOString(), '2026-11-11T11:30:00.000Z')
  assert.equal(AttendanceCorrectionModel.documents.length, 1)
})

test('holiday creation validates dates and returns configured holidays', async () => {
  const { service } = createTestService()
  await assert.rejects(service.createHoliday({ workDate: '2026-02-30', name: 'Invalid' }), /valid YYYY-MM-DD/)
  const holiday = await service.createHoliday({
    workDate: '2026-11-14',
    name: '  Company day  ',
    description: '  Office closed  ',
  })
  assert.equal(holiday.name, 'Company day')
  assert.equal(holiday.description, 'Office closed')
  assert.equal((await service.listHolidays({ from: '2026-11-14', to: '2026-11-14' })).length, 1)
})

test('history exposes incomplete status for open records from previous work dates', async () => {
  const oldPunch = {
    _id: new mongoose.Types.ObjectId(),
    employeeId,
    workDate: '2026-11-10',
    checkInAt: new Date('2026-11-10T03:30:00.000Z'),
    checkOutAt: null,
    status: 'PRESENT',
  }
  const todaysPunch = {
    ...oldPunch,
    _id: new mongoose.Types.ObjectId(),
    workDate: '2026-11-11',
  }
  const { service } = createTestService({ attendance: [oldPunch, todaysPunch] })
  const result = await service.listMine({ employeeId })
  assert.equal(result.attendance.find((record) => record.workDate === '2026-11-10').status, 'INCOMPLETE')
  assert.equal(result.attendance.find((record) => record.workDate === '2026-11-11').status, 'PRESENT')
})

test('summary excludes holidays and approved leave from absence counts', async () => {
  const workOnMonday = {
    _id: new mongoose.Types.ObjectId(),
    employeeId,
    workDate: '2026-11-09',
    checkInAt: new Date('2026-11-09T03:30:00.000Z'),
    checkOutAt: new Date('2026-11-09T12:30:00.000Z'),
    workDurationMinutes: 540,
    status: 'PRESENT',
  }
  const workedHoliday = {
    ...workOnMonday,
    _id: new mongoose.Types.ObjectId(),
    workDate: '2026-11-10',
  }
  const leave = {
    employeeId,
    status: 'APPROVED',
    startDate: new Date('2026-11-11T00:00:00.000Z'),
    endDate: new Date('2026-11-11T00:00:00.000Z'),
  }
  const { service } = createTestService({
    now: '2026-11-12T03:00:00.000Z',
    attendance: [workOnMonday, workedHoliday],
    holidays: [{ workDate: '2026-11-10' }],
    leaves: [leave],
  })
  const summary = await service.getSummary({ from: '2026-11-09', to: '2026-11-11' })
  assert.equal(summary.scheduledWorkdays, 2)
  assert.equal(summary.present, 2)
  assert.equal(summary.onLeave, 1)
  assert.equal(summary.absent, 0)
  assert.equal(summary.holidayDates, 1)
  assert.equal(summary.workedOnNonWorkingDay, 1)
  assert.equal(summary.totalWorkDurationMinutes, 1080)
})

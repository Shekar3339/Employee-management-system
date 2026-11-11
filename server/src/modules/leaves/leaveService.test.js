import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { createLeaveService, LeaveServiceError } from './leaveService.js'

const employeeId = new mongoose.Types.ObjectId().toString()
const adminId = new mongoose.Types.ObjectId().toString()
const leaveId = new mongoose.Types.ObjectId().toString()

function makeService({ employee = { _id: employeeId }, leave = null } = {}) {
  const calls = {}
  const leaveDoc = leave ?? {
    _id: leaveId,
    status: 'PENDING',
    async save() { calls.saved = true },
  }

  const LeaveModel = {
    create: async (value) => (calls.created = value),
    find: (filter) => {
      calls.filter = filter
      return {
        select(fields) {
          calls.selected = fields
          return this
        },
        populate(options) {
          calls.populated = [...(calls.populated ?? []), options]
          return this
        },
        sort(order) {
          calls.sort = order
          return this
        },
        lean: async () => [{ leaveType: 'Annual', status: 'PENDING' }],
      }
    },
    findById: async (id) => {
      calls.foundId = id
      return leaveDoc
    },
  }
  const EmployeeModel = { findById: async (id) => (calls.employeeId = id, employee) }
  return { service: createLeaveService({ LeaveModel, EmployeeModel }), calls, leaveDoc }
}

test('POST /api/leaves data is employee-owned and forced to PENDING', async () => {
  const { service, calls } = makeService()
  const result = await service.apply(
    { employeeId },
    {
      employeeId: new mongoose.Types.ObjectId().toString(),
      leaveType: ' Annual ',
      startDate: '2026-11-10',
      endDate: '2026-11-11',
      reason: 'Personal',
      status: 'APPROVED',
    },
  )
  assert.equal(result.employeeId, employeeId)
  assert.equal(result.status, 'PENDING')
  assert.equal(result.leaveType, 'Annual')
  assert.equal(calls.employeeId, employeeId)
})

test('GET /api/leaves/mine filters to the authenticated employee and sorts newest first', async () => {
  const { service, calls } = makeService()
  const result = await service.listMine({ employeeId })
  assert.deepEqual(calls.filter, { employeeId })
  assert.deepEqual(calls.sort, { createdAt: -1 })
  assert.match(calls.selected, /reviewedBy/)
  assert.match(calls.selected, /reviewedAt/)
  assert.deepEqual(calls.populated, [{ path: 'reviewedBy', select: 'name email' }])
  assert.equal(result[0].status, 'PENDING')
})

test('GET /api/leaves populates employee and reviewer details and sorts newest first', async () => {
  const { service, calls } = makeService()
  await service.listAll()
  assert.deepEqual(calls.populated, [
    {
      path: 'employeeId',
      select: 'name email designation departmentId',
      populate: { path: 'departmentId', select: 'name' },
    },
    { path: 'reviewedBy', select: 'name email' },
  ])
  assert.deepEqual(calls.sort, { createdAt: -1 })
})

test('PATCH /api/leaves/:id/status records reviewer and review time', async () => {
  const { service, calls, leaveDoc } = makeService()
  await service.review({ id: adminId }, leaveId, 'APPROVED')
  assert.equal(calls.foundId, leaveId)
  assert.equal(leaveDoc.status, 'APPROVED')
  assert.equal(leaveDoc.reviewedBy, adminId)
  assert.ok(leaveDoc.reviewedAt instanceof Date)
  assert.equal(calls.saved, true)
})

test('rejects invalid date range, unknown status, invalid id, missing employee, and repeated review', async () => {
  const { service } = makeService()
  await assert.rejects(
    service.apply({ employeeId }, {
      leaveType: 'Annual', startDate: '2026-11-12', endDate: '2026-11-11', reason: 'Personal',
    }),
    (err) => err instanceof LeaveServiceError && err.errors.some((item) => item.includes('endDate')),
  )
  await assert.rejects(service.review({ id: adminId }, leaveId, 'PENDING'), LeaveServiceError)
  await assert.rejects(service.review({ id: adminId }, 'bad-id', 'APPROVED'), LeaveServiceError)
  const missingEmployee = makeService({ employee: null })
  await assert.rejects(missingEmployee.service.listMine({ employeeId }), (err) => err.statusCode === 404)
  const reviewed = makeService({ leave: { status: 'APPROVED' } })
  await assert.rejects(reviewed.service.review({ id: adminId }, leaveId, 'REJECTED'), (err) => err.statusCode === 409)
})

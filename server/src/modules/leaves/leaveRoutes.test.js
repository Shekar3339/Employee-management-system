import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { createLeaveRouter } from './leaveRoutes.js'

const employeeId = new mongoose.Types.ObjectId().toString()
const otherEmployeeId = new mongoose.Types.ObjectId().toString()
const adminId = new mongoose.Types.ObjectId().toString()
const leaveId = new mongoose.Types.ObjectId().toString()

function createModels() {
  const findFilters = []
  const savedLeave = {
    _id: leaveId,
    employeeId,
    leaveType: 'Annual',
    startDate: new Date('2026-11-10'),
    endDate: new Date('2026-11-11'),
    reason: 'Personal',
    status: 'PENDING',
    async save() {},
  }
  const otherLeave = {
    _id: new mongoose.Types.ObjectId().toString(),
    employeeId: { _id: otherEmployeeId, name: 'Another Employee', email: 'another@example.test' },
    leaveType: 'Sick',
    status: 'PENDING',
  }
  const query = (value) => ({
    select() { return this },
    populate(options) {
      this.populateOptions = options
      return this
    },
    sort() { return this },
    lean: async () => value,
  })
  return {
    findFilters,
    EmployeeModel: { findById: async () => ({ _id: employeeId }) },
    LeaveModel: {
      create: async (data) => ({ _id: leaveId, ...data }),
      find(filter) {
        findFilters.push(filter)
        return query(filter ? [savedLeave] : [savedLeave, otherLeave])
      },
      findById: async () => savedLeave,
    },
    savedLeave,
    otherLeave,
  }
}

function mockAuth(req, res, next) {
  if (!req.testToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized', errors: [] })
  }
  req.user = req.testUser
  return next()
}

function mockAuthorize(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ success: false, message: 'Forbidden', errors: [] })
    }
    return next()
  }
}

async function callRoute(router, method, path, { user, token = user ? 'mock-token' : null, body = {}, params = {} } = {}) {
  const layer = router.stack.find(
    (item) => item.route?.path === path && item.route.methods[method.toLowerCase()],
  )
  assert.ok(layer, `${method} ${path} route should be registered`)

  const req = { method: method.toUpperCase(), path, params, body, testUser: user, testToken: token }
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
  const handlers = layer.route.stack.map((item) => item.handle)
  async function run(index) {
    if (index >= handlers.length) return
    let nextPromise
    const next = (err) => {
      if (err) return Promise.reject(err)
      nextPromise = run(index + 1)
      return nextPromise
    }
    await handlers[index](req, res, next)
    if (nextPromise) await nextPromise
  }
  await run(0)
  return res
}

test('all four endpoints enforce mock authentication and return the expected data', async () => {
  const { EmployeeModel, LeaveModel, savedLeave, otherLeave, findFilters } = createModels()
  const router = createLeaveRouter({
    authenticateMiddleware: mockAuth,
    authorizeMiddleware: mockAuthorize,
    EmployeeModel,
    LeaveModel,
  })

  const submitted = await callRoute(router, 'POST', '/', {
    user: { id: employeeId, employeeId, role: 'EMPLOYEE' },
    body: { leaveType: 'Annual', startDate: '2026-11-10', endDate: '2026-11-11', reason: 'Personal' },
  })
  assert.equal(submitted.statusCode, 201)
  assert.equal(submitted.payload.success, true)
  assert.equal(submitted.payload.data.status, 'PENDING')

  const ownHistory = await callRoute(router, 'GET', '/mine', {
    user: { id: employeeId, employeeId, role: 'EMPLOYEE' },
  })
  assert.equal(ownHistory.statusCode, 200)
  assert.equal(ownHistory.payload.success, true)
  assert.deepEqual(findFilters.at(-1), { employeeId })
  assert.equal(ownHistory.payload.data.length, 1)

  const allRequests = await callRoute(router, 'GET', '/', {
    user: { id: adminId, role: 'ADMIN' },
  })
  assert.equal(allRequests.statusCode, 200)
  assert.equal(allRequests.payload.success, true)
  assert.equal(allRequests.payload.data.length, 2)
  assert.equal(allRequests.payload.data[1].employeeId.name, 'Another Employee')
  assert.equal(allRequests.payload.data[1].employeeId.email, 'another@example.test')

  const reviewed = await callRoute(router, 'PATCH', '/:id/status', {
    user: { id: adminId, role: 'ADMIN' },
    params: { id: leaveId },
    body: { status: 'REJECTED' },
  })
  assert.equal(reviewed.statusCode, 200)
  assert.equal(reviewed.payload.data.reviewedBy, adminId)

  const denied = await callRoute(router, 'GET', '/', {
    user: { id: employeeId, employeeId, role: 'EMPLOYEE' },
  })
  assert.equal(denied.statusCode, 403)
  assert.equal(savedLeave.status, 'REJECTED')

  const unauthenticated = await callRoute(router, 'GET', '/mine', { token: null })
  assert.equal(unauthenticated.statusCode, 401)
})

test('employee apply validation and missing employee link are rejected', async () => {
  const { EmployeeModel, LeaveModel, findFilters } = createModels()
  const router = createLeaveRouter({
    authenticateMiddleware: mockAuth,
    authorizeMiddleware: mockAuthorize,
    EmployeeModel,
    LeaveModel,
  })
  const employee = { id: employeeId, employeeId, role: 'EMPLOYEE' }
  const cases = [
    [{ reason: 'Personal', startDate: '2026-11-10', endDate: '2026-11-11' }, /leaveType/],
    [{ leaveType: 'Annual', startDate: '2026-11-10', endDate: '2026-11-11' }, /reason/],
    [{ leaveType: 'Annual', reason: 'Personal', startDate: 'not-a-date', endDate: '2026-11-11' }, /startDate/],
    [{ leaveType: 'Annual', reason: 'Personal', startDate: '2026-02-30', endDate: '2026-03-01' }, /startDate/],
    [{ leaveType: 'Annual', reason: 'Personal', startDate: '2026-11-12', endDate: '2026-11-11' }, /endDate/],
  ]
  for (const [body, expectedError] of cases) {
    const response = await callRoute(router, 'POST', '/', { user: employee, body })
    assert.equal(response.statusCode, 400)
    assert.ok(response.payload.errors.some((item) => expectedError.test(item)))
  }

  const noLinkedEmployee = await callRoute(router, 'POST', '/', {
    user: { ...employee, employeeId: null },
    body: { leaveType: 'Annual', reason: 'Personal', startDate: '2026-11-10', endDate: '2026-11-11' },
  })
  assert.equal(noLinkedEmployee.statusCode, 404)
  assert.equal(findFilters.length, 0)
})

test('admins can approve and reject pending requests; employees and terminal statuses cannot be updated', async () => {
  const pending = () => ({ status: 'PENDING', async save() {} })
  const makeReviewRouter = (leave) => createLeaveRouter({
    authenticateMiddleware: mockAuth,
    authorizeMiddleware: mockAuthorize,
    EmployeeModel: { findById: async () => ({ _id: employeeId }) },
    LeaveModel: {
      create: async (value) => value,
      find: () => ({ populate() { return this }, sort() { return this }, lean: async () => [] }),
      findById: async () => leave,
    },
  })
  const admin = { id: adminId, role: 'ADMIN' }

  const approvedDoc = pending()
  const approved = await callRoute(makeReviewRouter(approvedDoc), 'PATCH', '/:id/status', {
    user: admin, params: { id: leaveId }, body: { status: 'APPROVED' },
  })
  assert.equal(approved.statusCode, 200)
  assert.equal(approvedDoc.status, 'APPROVED')

  const rejectedDoc = pending()
  const rejected = await callRoute(makeReviewRouter(rejectedDoc), 'PATCH', '/:id/status', {
    user: admin, params: { id: leaveId }, body: { status: 'REJECTED' },
  })
  assert.equal(rejected.statusCode, 200)
  assert.equal(rejectedDoc.status, 'REJECTED')

  const employeeAttempt = await callRoute(makeReviewRouter(pending()), 'PATCH', '/:id/status', {
    user: { id: employeeId, employeeId, role: 'EMPLOYEE' },
    params: { id: leaveId }, body: { status: 'APPROVED' },
  })
  assert.equal(employeeAttempt.statusCode, 403)

  for (const status of ['APPROVED', 'REJECTED']) {
    const alreadyReviewed = await callRoute(makeReviewRouter({ status }), 'PATCH', '/:id/status', {
      user: admin, params: { id: leaveId }, body: { status: 'APPROVED' },
    })
    assert.equal(alreadyReviewed.statusCode, 409)
  }

  const invalidStatus = await callRoute(makeReviewRouter(pending()), 'PATCH', '/:id/status', {
    user: admin, params: { id: leaveId }, body: { status: 'PENDING' },
  })
  assert.equal(invalidStatus.statusCode, 400)

  const invalidId = await callRoute(makeReviewRouter(pending()), 'PATCH', '/:id/status', {
    user: admin, params: { id: 'not-an-id' }, body: { status: 'APPROVED' },
  })
  assert.equal(invalidId.statusCode, 400)
})

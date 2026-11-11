import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { createAttendanceRouter } from './attendanceRoutes.js'

const employeeId = new mongoose.Types.ObjectId().toString()
const adminId = new mongoose.Types.ObjectId().toString()

const service = new Proxy({}, {
  get: (_target, method) => async (user) => ({ method, role: user.role }),
})

function authenticate(request, _response, next) {
  request.user = request.testUser
  return next()
}

function authorize(role) {
  return (request, response, next) => {
    if (request.user?.role !== role) {
      return response.status(403).json({ success: false, message: 'Forbidden', errors: [] })
    }
    return next()
  }
}

async function callRoute(router, method, path, user) {
  const layer = router.stack.find(
    (item) => item.route?.path === path && item.route.methods[method.toLowerCase()],
  )
  assert.ok(layer, `${method} ${path} should be registered`)
  const request = { method: method.toUpperCase(), path, params: {}, body: {}, query: {}, user: null, testUser: user }
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this },
  }
  const handlers = layer.route.stack.map((item) => item.handle)
  async function run(index) {
    if (index >= handlers.length) return
    let nextPromise
    const next = () => {
      nextPromise = run(index + 1)
      return nextPromise
    }
    await handlers[index](request, response, next)
    if (nextPromise) await nextPromise
  }
  await run(0)
  return response
}

test('attendance routes enforce employee and admin roles', async () => {
  const router = createAttendanceRouter({
    authenticateMiddleware: authenticate,
    authorizeMiddleware: authorize,
    service,
  })
  const routes = router.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`)
  assert.deepEqual(routes, [
    'POST /check-in',
    'POST /check-out',
    'GET /mine',
    'POST /mine/corrections',
    'GET /mine/corrections',
    'GET /corrections',
    'PATCH /corrections/:correctionId',
    'GET /reports/summary',
    'GET /holidays',
    'POST /holidays',
    'PUT /holidays/:holidayId',
    'DELETE /holidays/:holidayId',
    'GET /',
  ])

  const employeeRequest = await callRoute(router, 'POST', '/check-in', {
    id: employeeId, employeeId, role: 'EMPLOYEE',
  })
  assert.equal(employeeRequest.statusCode, 201)
  assert.equal(employeeRequest.payload.data.method, 'checkIn')

  const adminRequest = await callRoute(router, 'GET', '/', { id: adminId, role: 'ADMIN' })
  assert.equal(adminRequest.statusCode, 200)
  assert.equal(adminRequest.payload.data.method, 'listAll')

  const deniedEmployeeReport = await callRoute(router, 'GET', '/reports/summary', {
    id: employeeId, employeeId, role: 'EMPLOYEE',
  })
  assert.equal(deniedEmployeeReport.statusCode, 403)

  const deniedAdminPunch = await callRoute(router, 'POST', '/check-in', {
    id: adminId, role: 'ADMIN',
  })
  assert.equal(deniedAdminPunch.statusCode, 403)
})

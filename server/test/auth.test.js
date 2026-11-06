import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { createAuthController } from '../src/modules/auth/auth.controller.js'
import { createAuthService } from '../src/modules/auth/auth.service.js'
import { createAuthMiddleware } from '../src/shared/middleware/auth.js'
import { hashPassword, verifyPassword } from '../src/shared/utils/password.js'

process.env.JWT_SECRET = 'test-only-secret'
process.env.JWT_EXPIRES_IN = '1h'

const password = 'correct-password'
const passwordHash = await hashPassword(password)
const userId = '507f1f77bcf86cd799439011'

function makeUser({ role = 'ADMIN', isActive = true, employeeId = null } = {}) {
  return {
    _id: { toString: () => userId },
    name: role === 'ADMIN' ? 'Admin User' : 'Employee User',
    email: `${role.toLowerCase()}@example.com`,
    passwordHash,
    role,
    employeeId: employeeId && { toString: () => employeeId },
    isActive,
  }
}

function makeResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

function controllerFor(users) {
  const UserModel = {
    findOne: async ({ email }) => users.find((user) => user.email === email) ?? null,
    findById: async (id) => users.find((user) => user._id.toString() === id) ?? null,
  }
  return createAuthController({ service: createAuthService({ UserModel }) })
}

async function runMiddleware(middleware, request) {
  const response = makeResponse()
  let nextCalled = false
  await middleware(request, response, () => { nextCalled = true })
  return { response, nextCalled }
}

test('password hashing and comparison work without returning plaintext', async () => {
  const hash = await hashPassword('another-password')
  assert.notEqual(hash, 'another-password')
  assert.equal(await verifyPassword('another-password', hash), true)
  assert.equal(await verifyPassword('wrong-password', hash), false)
})

test('successful ADMIN login returns safe user data and a subject JWT', async () => {
  const response = makeResponse()
  await controllerFor([makeUser()]).login({ body: { email: ' ADMIN@example.com ', password } }, response)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.user.role, 'ADMIN')
  assert.equal(response.body.data.user.employeeId, null)
  assert.equal(jwt.verify(response.body.data.token, process.env.JWT_SECRET).sub, userId)
})

test('successful EMPLOYEE login returns the linked employee ID', async () => {
  const response = makeResponse()
  await controllerFor([makeUser({ role: 'EMPLOYEE', employeeId: '507f191e810c19729de860ea' })]).login(
    { body: { email: 'employee@example.com', password } }, response,
  )
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.user.employeeId, '507f191e810c19729de860ea')
})

test('invalid password returns generic 401', async () => {
  const response = makeResponse()
  await controllerFor([makeUser()]).login({ body: { email: 'admin@example.com', password: 'wrong' } }, response)
  assert.equal(response.statusCode, 401)
  assert.equal(response.body.message, 'Invalid email or password')
})

test('unknown email returns the same generic 401', async () => {
  const response = makeResponse()
  await controllerFor([]).login({ body: { email: 'unknown@example.com', password } }, response)
  assert.equal(response.statusCode, 401)
  assert.equal(response.body.message, 'Invalid email or password')
})

test('missing email or password returns 400', async () => {
  for (const body of [{ password }, { email: 'admin@example.com' }]) {
    const response = makeResponse()
    await controllerFor([]).login({ body }, response)
    assert.equal(response.statusCode, 400)
  }
})

test('inactive users cannot log in', async () => {
  const response = makeResponse()
  await controllerFor([makeUser({ isActive: false })]).login({ body: { email: 'admin@example.com', password } }, response)
  assert.equal(response.statusCode, 401)
})

test('authenticate rejects a missing Authorization header', async () => {
  const { authenticate } = createAuthMiddleware({ UserModel: { findById: async () => null } })
  const { response } = await runMiddleware(authenticate, { headers: {} })
  assert.equal(response.statusCode, 401)
})

test('authenticate rejects malformed Bearer token', async () => {
  const { authenticate } = createAuthMiddleware({ UserModel: { findById: async () => null } })
  const { response } = await runMiddleware(authenticate, { headers: { authorization: 'Token abc' } })
  assert.equal(response.statusCode, 401)
})

test('authenticate rejects an invalid JWT', async () => {
  const { authenticate } = createAuthMiddleware({ UserModel: { findById: async () => null } })
  const { response } = await runMiddleware(authenticate, { headers: { authorization: 'Bearer invalid' } })
  assert.equal(response.statusCode, 401)
})

test('authenticate rejects an expired JWT', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '-1s' })
  const { authenticate } = createAuthMiddleware({ UserModel: { findById: async () => makeUser() } })
  const { response } = await runMiddleware(authenticate, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(response.statusCode, 401)
})

test('authenticate rejects a deleted user', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '1h' })
  const { authenticate } = createAuthMiddleware({ UserModel: { findById: async () => null } })
  const { response } = await runMiddleware(authenticate, { headers: { authorization: `Bearer ${token}` } })
  assert.equal(response.statusCode, 401)
})

test('GET /me returns current safe user data', async () => {
  const response = makeResponse()
  await controllerFor([makeUser()]).me({ user: { id: userId, role: 'ADMIN', employeeId: null } }, response)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.message, 'Current user retrieved successfully')
  assert.equal(response.body.data.user.passwordHash, undefined)
})

test('authorize permits ADMIN', async () => {
  const { authorize } = createAuthMiddleware()
  const { response, nextCalled } = await runMiddleware(authorize('ADMIN'), { user: { role: 'ADMIN' } })
  assert.equal(nextCalled, true)
  assert.equal(response.statusCode, undefined)
})

test('authorize permits EMPLOYEE', async () => {
  const { authorize } = createAuthMiddleware()
  const { response, nextCalled } = await runMiddleware(authorize('EMPLOYEE'), { user: { role: 'EMPLOYEE' } })
  assert.equal(nextCalled, true)
  assert.equal(response.statusCode, undefined)
})

test('authorize rejects an unauthorized role with 403', async () => {
  const { authorize } = createAuthMiddleware()
  const { response } = await runMiddleware(authorize('ADMIN'), { user: { role: 'EMPLOYEE' } })
  assert.equal(response.statusCode, 403)
  assert.equal(response.body.success, false)
})

test('no login response contains passwordHash', async () => {
  const response = makeResponse()
  await controllerFor([makeUser()]).login({ body: { email: 'admin@example.com', password } }, response)
  assert.equal(JSON.stringify(response.body).includes('passwordHash'), false)
})

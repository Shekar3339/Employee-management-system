import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import mongoose from 'mongoose'
import { createEmployeeRouter } from './employee.routes.js'
import { createEmployeeController } from './employee.controller.js'
import { createEmployeeService, validateEmployeeFields } from './employee.service.js'
import { departmentsFromResponse } from '../../../../client/src/features/employees/departmentResponse.js'

const departmentId = new mongoose.Types.ObjectId().toString()

it('rejects malformed phone numbers, invalid calendar dates, and future joining dates', () => {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 1)
  const errors = validateEmployeeFields({
    name: 'Avery Smith',
    email: 'avery@example.com',
    phone: 'not-a-phone',
    designation: 'Developer',
    departmentId,
    joiningDate: futureDate.toISOString().slice(0, 10),
  })

  assert.equal(errors.some((error) => error.field === 'phone'), true)
  assert.equal(errors.some((error) => error.field === 'joiningDate'), true)

  const invalidDateErrors = validateEmployeeFields({
    name: 'Avery Smith',
    email: 'avery@example.com',
    designation: 'Developer',
    departmentId,
    joiningDate: '2024-02-31',
  })
  assert.equal(invalidDateErrors.some((error) => error.field === 'joiningDate'), true)
})

function matches(record, filter = {}) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((branch) => matches(record, branch))
    if (value && typeof value === 'object' && '$ne' in value) return String(record[key]) !== String(value.$ne)
    if (value instanceof RegExp) return value.test(String(record[key] || ''))
    return String(record[key]) === String(value)
  })
}

function makeDatabase({ transactionsUnsupported = false } = {}) {
  const records = { departments: new Map(), users: new Map(), employees: new Map() }
  const failures = { employeeSave: null }

  class Query {
    constructor(resolve) { this.resolveValue = resolve; this.options = {} }
    populate() { this.options.populate = true; return this }
    sort() { return this }
    skip(value) { this.options.skip = value; return this }
    limit(value) { this.options.limit = value; return this }
    select(value) { this.options.select = value.split(/\s+/); return this }
    async lean() { return this.result(true) }
    async result(asLean = false) {
      const value = await this.resolveValue()
      const project = (record) => {
        if (!record) return record
        const copy = { ...record }
        if (this.options.populate && copy.departmentId) {
          const department = records.departments.get(String(copy.departmentId))
          if (department) copy.departmentId = { _id: department._id, name: department.name }
        }
        if (this.options.select) {
          return Object.fromEntries(['_id', ...this.options.select].filter((field) => field in copy).map((field) => [field, copy[field]]))
        }
        return copy
      }
      if (Array.isArray(value)) {
        const rows = value.slice(this.options.skip || 0, this.options.limit ? (this.options.skip || 0) + this.options.limit : undefined)
        return asLean ? rows.map(project) : rows
      }
      return asLean ? project(value) : value
    }
    then(resolve, reject) { return this.result().then(resolve, reject) }
  }

  function model(collection) {
    return class Model {
      constructor(data) {
        Object.assign(this, data)
        this._id ||= new mongoose.Types.ObjectId().toString()
      }
      async save() {
        if (collection === 'employees' && failures.employeeSave) {
          const error = failures.employeeSave
          failures.employeeSave = null
          throw error
        }
        records[collection].set(String(this._id), this)
        return this
      }
      static find(filter) { return new Query(() => [...records[collection].values()].filter((item) => matches(item, filter))) }
      static findById(id) { return new Query(() => records[collection].get(String(id)) || null) }
      static countDocuments(filter) { return Promise.resolve([...records[collection].values()].filter((item) => matches(item, filter)).length) }
      static exists(filter) { return Promise.resolve([...records[collection].values()].some((item) => matches(item, filter)) ? { _id: 'exists' } : null) }
      static async updateOne(filter, changes) {
        const record = [...records[collection].values()].find((item) => matches(item, filter))
        if (record) Object.assign(record, changes)
        return { matchedCount: record ? 1 : 0 }
      }
      static async deleteOne(filter) {
        const record = [...records[collection].values()].find((item) => matches(item, filter))
        if (record) records[collection].delete(String(record._id))
        return { deletedCount: record ? 1 : 0 }
      }
    }
  }

  const models = {
    Department: model('departments'),
    Employee: model('employees'),
    User: model('users'),
  }
  const database = {
    async startSession() {
      return {
        async withTransaction(callback) {
          if (transactionsUnsupported) throw new Error('Transaction numbers are only allowed on a replica set member or mongos')
          const snapshots = Object.fromEntries(Object.entries(records).map(([key, value]) => [key, new Map(value)]))
          try { await callback() } catch (error) {
            for (const key of Object.keys(records)) {
              records[key].clear()
              for (const [id, record] of snapshots[key]) records[key].set(id, record)
            }
            throw error
          }
        },
        async endSession() {},
      }
    },
  }
  return { records, failures, models, database }
}

const employeeInput = (overrides = {}) => ({
  name: 'Test Employee',
  email: 'emp.test+module@example.com',
  designation: 'Analyst',
  departmentId,
  joiningDate: '2025-01-15',
  ...overrides,
})

describe('employee service', () => {
  it('generates a temporary password, stores only its injected hash, and returns it after linked creation', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    let inputToHasher
    const loggedValues = []
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    console.log = (...args) => loggedValues.push(args.join(' '))
    console.error = (...args) => loggedValues.push(args.join(' '))
    console.warn = (...args) => loggedValues.push(args.join(' '))
    const service = createEmployeeService({
      models: fake.models,
      database: fake.database,
      hashPassword: async (value) => { inputToHasher = value; return 'mock-hash-value' },
    })

    let created
    try {
      created = await service.create(employeeInput())
    } finally {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
    const user = fake.records.users.get(String(created.employee.userId))
    assert.equal(typeof created.temporaryPassword, 'string')
    assert.equal(created.temporaryPassword.length, 32)
    assert.equal(inputToHasher, created.temporaryPassword)
    assert.equal(user.passwordHash, 'mock-hash-value')
    assert.equal('password' in user, false)
    assert.equal(JSON.stringify(user).includes(created.temporaryPassword), false)
    assert.equal(loggedValues.join(' ').includes(created.temporaryPassword), false)
    assert.equal(String(user.employeeId), String(created.employee._id))
    assert.equal(String(created.employee.userId), String(user._id))
    assert.equal(user.email, created.employee.email)
    assert.equal(String(created.employee.departmentId), departmentId)
  })

  it('uses scoped rollback when transactions are unsupported', async () => {
    const fake = makeDatabase({ transactionsUnsupported: true })
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const service = createEmployeeService({
      models: fake.models,
      database: fake.database,
      hashPassword: async () => 'hash',
    })
    const created = await service.create(employeeInput())
    assert.equal(fake.records.users.size, 1)
    assert.equal(fake.records.employees.has(String(created.employee._id)), true)
  })

  it('does not retry a failed transaction as a nontransactional write for unrelated replica-set errors', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const unavailableNetwork = new Error('replica set server selection timed out')
    const database = {
      async startSession() {
        return { withTransaction: async () => { throw unavailableNetwork }, endSession: async () => {} }
      },
    }
    const service = createEmployeeService({ models: fake.models, database, hashPassword: async () => 'hash' })

    await assert.rejects(service.create(employeeInput()), (error) => error === unavailableNetwork)
    assert.equal(fake.records.users.size, 0)
    assert.equal(fake.records.employees.size, 0)
  })

  it('rejects duplicate emails with 409 before creating or hashing a record', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const ExistingUser = new fake.models.User({ email: 'emp.test+module@example.com' })
    await ExistingUser.save()
    let hashCalls = 0
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => { hashCalls += 1; return 'hash' } })

    await assert.rejects(service.create(employeeInput()), (error) => error.status === 409)
    assert.equal(hashCalls, 0)
    assert.equal(fake.records.users.size, 1)
    assert.equal(fake.records.employees.size, 0)
  })

  it('maps a duplicate-email race during the transactional save to 409', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    fake.models.User.exists = async () => null
    fake.models.User.prototype.save = async () => {
      const error = new Error('duplicate key')
      error.code = 11000
      throw error
    }
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => 'hash' })

    await assert.rejects(service.create(employeeInput()), (error) => error.status === 409)
    assert.equal(fake.records.users.size, 0)
    assert.equal(fake.records.employees.size, 0)
  })

  it('synchronizes employee and user names/emails on update', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => 'hash' })
    const created = await service.create(employeeInput())
    const updated = await service.update(created.employee._id, { name: 'Updated Name', email: 'emp.test+updated@example.com' })
    const user = fake.records.users.get(String(created.employee.userId))
    assert.equal(updated.name, 'Updated Name')
    assert.equal(updated.email, 'emp.test+updated@example.com')
    assert.equal(user.name, updated.name)
    assert.equal(user.email, updated.email)
  })

  it('updates employee and user activation together for deactivation and reactivation', async () => {
    const fake = makeDatabase()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => 'hash' })
    const created = await service.create(employeeInput())

    await service.updateStatus(created.employee._id, 'INACTIVE')
    assert.equal(fake.records.employees.get(String(created.employee._id)).status, 'INACTIVE')
    assert.equal(fake.records.users.get(String(created.employee.userId)).isActive, false)
    await service.updateStatus(created.employee._id, 'ACTIVE')
    assert.equal(fake.records.employees.get(String(created.employee._id)).status, 'ACTIVE')
    assert.equal(fake.records.users.get(String(created.employee.userId)).isActive, true)
  })

  it('searches supported fields and applies department, status, and pagination filters', async () => {
    const fake = makeDatabase()
    const secondDepartmentId = new mongoose.Types.ObjectId().toString()
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    fake.records.departments.set(secondDepartmentId, { _id: secondDepartmentId, name: 'Finance' })
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => 'hash' })
    await service.create(employeeInput({ name: 'Ada Lovelace' }))
    await service.create(employeeInput({ name: 'Ada Example', email: 'emp.test+second@example.com', departmentId: secondDepartmentId, designation: 'Designer' }))
    await service.create(employeeInput({ name: 'Grace Example', email: 'emp.test+third@example.com' }))

    const result = await service.list({ search: 'Ada', departmentId, status: 'ACTIVE', page: '1', limit: '1' })
    assert.equal(result.employees.length, 1)
    assert.equal(result.employees[0].name, 'Ada Lovelace')
    assert.deepEqual(result.pagination, { page: 1, limit: 1, total: 1, pages: 1 })
    const escapedSearch = await service.list({ search: '[', page: '1', limit: '10' })
    assert.equal(escapedSearch.pagination.total, 0)
  })

  it('rolls back only this request’s newly created user after a fallback employee save fails', async () => {
    const fake = makeDatabase({ transactionsUnsupported: true })
    fake.records.departments.set(departmentId, { _id: departmentId, name: 'Operations' })
    const oldUser = new fake.models.User({ email: 'preexisting@example.com' })
    await oldUser.save()
    const service = createEmployeeService({ models: fake.models, database: fake.database, hashPassword: async () => 'hash' })
    fake.failures.employeeSave = new Error('simulated save failure')

    await assert.rejects(service.create(employeeInput()), /simulated save failure/)
    assert.equal(fake.records.users.size, 1)
    assert.equal(fake.records.users.has(String(oldUser._id)), true)
    assert.equal(fake.records.employees.size, 0)
  })
})

describe('employee route contract and injected access middleware', () => {
  const calls = []
  const service = Object.fromEntries(['list', 'create', 'getMe', 'getById', 'update', 'updateStatus'].map((method) => [
    method,
    async (...args) => { calls.push([method, ...args]); return { method, args } },
  ]))
  const authenticate = (req, res, next) => req.user
    ? next()
    : res.status(401).json({ success: false, message: 'Unauthenticated', errors: [] })
  const authorize = (...roles) => {
    const middleware = (req, res, next) => roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({ success: false, message: 'Forbidden', errors: [] })
    middleware.allowedRoles = roles
    return middleware
  }
  const router = createEmployeeRouter({ authenticate, authorize, service })

  function findRoute(method, path) {
    return router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method.toLowerCase()])?.route
  }

  function responseMock() {
    return {
      statusCode: 200,
      status(code) { this.statusCode = code; return this },
      json(payload) { this.payload = payload; return this },
    }
  }

  it('protects all six endpoints and applies ADMIN/EMPLOYEE role checks', async () => {
    const endpoints = [
      ['get', '/', 'ADMIN', 'list'],
      ['post', '/', 'ADMIN', 'create'],
      ['get', '/me', 'EMPLOYEE', 'getMe'],
      ['get', '/:id', 'ADMIN', 'getById'],
      ['put', '/:id', 'ADMIN', 'update'],
      ['patch', '/:id/status', 'ADMIN', 'updateStatus'],
    ]
    calls.length = 0
    for (const [method, path, role, calledMethod] of endpoints) {
      const route = findRoute(method, path)
      assert.ok(route, `${method.toUpperCase()} ${path} is registered`)
      assert.equal(route.stack[0].handle, authenticate, 'authentication runs before the controller')
      const unauthenticated = responseMock()
      authenticate({ user: null }, unauthenticated, () => assert.fail('unauthenticated request passed'))
      assert.equal(unauthenticated.statusCode, 401)
      const roleGuard = route.stack[1].handle
      assert.deepEqual(roleGuard.allowedRoles, [role])
      const rejected = responseMock()
      roleGuard({ user: { role: role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN' } }, rejected, () => assert.fail('wrong role passed authorization'))
      assert.equal(rejected.statusCode, 403)
      roleGuard({ user: { role } }, responseMock(), () => {})

      const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        query: { search: 'Ada' },
        body: { status: 'INACTIVE' },
        user: { id: 'test-user-id', role, employeeId: '507f1f77bcf86cd799439012' },
      }
      const res = responseMock()
      await route.stack[2].handle(req, res)
      assert.equal(res.statusCode, method === 'post' ? 201 : 200)
      assert.equal(res.payload.success, true)
      assert.equal(calls.at(-1)[0], calledMethod)
    }
    assert.equal(calls[2][1], '507f1f77bcf86cd799439012', 'self-profile ID comes from req.user.employeeId')
  })

  it('normalizes both supported department response envelopes and rejects malformed responses', () => {
    const departments = [{ _id: departmentId, name: 'Operations' }]
    assert.deepEqual(departmentsFromResponse({ data: { success: true, data: departments } }), departments)
    assert.deepEqual(departmentsFromResponse({ data: { success: true, data: { departments } } }), departments)
    assert.throws(() => departmentsFromResponse({ data: { success: true, data: {} } }), /department list/)
  })

  it('keeps /me ahead of the parameter route and forwards list query filters', async () => {
    calls.length = 0
    const routeOrder = router.stack.filter((layer) => layer.route).map((layer) => layer.route.path)
    assert.ok(routeOrder.indexOf('/me') < routeOrder.indexOf('/:id'))
    const list = findRoute('get', '/')
    const res = responseMock()
    await list.stack[2].handle({ query: { search: 'Ada', page: '2', limit: '5', departmentId, status: 'ACTIVE' } }, res)
    assert.equal(res.statusCode, 200)
    const listCall = calls.find(([method]) => method === 'list')
    assert.deepEqual(listCall[1], { search: 'Ada', page: '2', limit: '5', departmentId, status: 'ACTIVE' })
    const me = findRoute('get', '/me')
    const meResponse = responseMock()
    await me.stack[2].handle({ user: { employeeId: '507f1f77bcf86cd799439012' } }, meResponse)
    assert.equal(meResponse.statusCode, 200)
    assert.equal(calls.at(-1)[1], '507f1f77bcf86cd799439012')
  })
})

describe('employee controller response security', () => {
  function responseMock() {
    return {
      statusCode: 200,
      status(code) { this.statusCode = code; return this },
      json(payload) { this.payload = payload; return this },
    }
  }

  it('returns temporaryPassword only in a successful 201 create response', async () => {
    const temporaryPassword = 'temporary-secret-for-test'
    const controller = createEmployeeController({
      service: {
        create: async () => ({ employee: { _id: 'employee-id', name: 'Test', passwordHash: 'must-not-leak', temporaryPassword: 'nested-secret' }, temporaryPassword }),
      },
    })
    const res = responseMock()
    await controller.create({ body: employeeInput() }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(res.payload.data.temporaryPassword, temporaryPassword)
    assert.equal('passwordHash' in res.payload.data.employee, false)
    assert.equal('temporaryPassword' in res.payload.data.employee, false)
    assert.equal(JSON.stringify(res.payload).includes('must-not-leak'), false)
    assert.equal(JSON.stringify(res.payload).includes('nested-secret'), false)
  })

  it('never returns temporaryPassword if creation fails', async () => {
    const controller = createEmployeeController({ service: { create: async () => { throw new Error('create failed') } } })
    const res = responseMock()
    await controller.create({ body: employeeInput() }, res)
    assert.equal(res.statusCode, 500)
    assert.equal(JSON.stringify(res.payload).includes('temporaryPassword'), false)
    assert.equal(JSON.stringify(res.payload).includes('temporary-secret'), false)
  })

  it('strips password fields from list, detail, update, and profile responses', async () => {
    const employee = { _id: 'employee-id', name: 'Test', password: 'raw-secret', passwordHash: 'hash-secret', temporaryPassword: 'temp-secret' }
    const controller = createEmployeeController({ service: {
      list: async () => ({ employees: [employee] }),
      getById: async () => employee,
      update: async () => employee,
      getMe: async () => employee,
    } })
    const cases = [
      [controller.list, { query: {} }],
      [controller.getById, { params: { id: 'id' } }],
      [controller.update, { params: { id: 'id' }, body: {} }],
      [controller.getMe, { user: { employeeId: 'employee-id' } }],
    ]
    for (const [handler, req] of cases) {
      const res = responseMock()
      await handler(req, res)
      assert.equal(res.statusCode, 200)
      const serialized = JSON.stringify(res.payload)
      assert.equal(serialized.includes('passwordHash'), false)
      assert.equal(serialized.includes('hash-secret'), false)
      assert.equal(serialized.includes('temporaryPassword'), false)
      assert.equal(serialized.includes('temp-secret'), false)
      assert.equal(serialized.includes('raw-secret'), false)
    }
  })
})

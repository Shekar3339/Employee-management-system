import assert from 'node:assert/strict'
import test from 'node:test'
import { createDepartmentService, DepartmentError } from './departmentService.js'

const id = '64b7f2a0123456789abcdef0'

function makeService({ activeCount = 0, departments = [], duplicate = false } = {}) {
  const saved = []
  const deleted = []
  const updated = []
  class FakeDepartment {
    constructor(values) { Object.assign(this, values) }
    async save() {
      if (duplicate) throw Object.assign(new Error('duplicate'), { code: 11000 })
      saved.push(this)
      return this
    }
    static find() { return { sort: () => ({ lean: async () => departments }) } }
    static async findByIdAndUpdate(departmentId, update, options) {
      updated.push({ departmentId, update, options })
      return { _id: departmentId, ...update.$set }
    }
    static async findByIdAndDelete(departmentId) {
      deleted.push(departmentId)
      return { _id: departmentId }
    }
  }
  const Employee = {
    aggregate: async () => [{ _id: id, count: 3 }],
    countDocuments: async () => activeCount,
  }
  return {
    service: createDepartmentService({ Department: FakeDepartment, Employee }),
    saved,
    deleted,
    updated,
  }
}

test('lists departments with active employee counts from ACTIVE employees only', async () => {
  const { service } = makeService({ departments: [{ _id: id, name: 'Engineering' }] })
  assert.deepEqual(await service.list(), [
    { _id: id, name: 'Engineering', activeEmployeeCount: 3 },
  ])
})

test('creates a trimmed department and reports duplicate names as conflict', async () => {
  const created = makeService()
  const department = await created.service.create({ name: '  Engineering  ', description: '  Build things  ' })
  assert.equal(department.name, 'Engineering')
  assert.equal(department.description, 'Build things')

  const duplicate = makeService({ duplicate: true })
  await assert.rejects(duplicate.service.create({ name: 'Engineering' }), (error) => {
    assert.ok(error instanceof DepartmentError)
    assert.equal(error.statusCode, 409)
    return true
  })
})

test('requires a non-empty department name', async () => {
  const { service } = makeService()
  await assert.rejects(service.create({ name: '  ' }), (error) => error.statusCode === 400)
})

test('rejects department names and descriptions beyond the supported limits', async () => {
  const { service } = makeService()
  await assert.rejects(service.create({ name: 'x'.repeat(101) }), (error) => error.statusCode === 400)
  await assert.rejects(service.create({ name: 'Engineering', description: 'x'.repeat(501) }), (error) => error.statusCode === 400)
})

test('updates a department with validators enabled', async () => {
  const { service, updated } = makeService()
  await service.update(id, { name: 'Product', description: '' })
  assert.deepEqual(updated[0], {
    departmentId: id,
    update: { $set: { name: 'Product', description: '' } },
    options: { new: true, runValidators: true },
  })
})

test('blocks deletion when active employees belong to the department', async () => {
  const { service, deleted } = makeService({ activeCount: 1 })
  await assert.rejects(service.remove(id), (error) => error.statusCode === 409)
  assert.deepEqual(deleted, [])
})

test('deletes a department when it has no active employees', async () => {
  const { service, deleted } = makeService()
  await service.remove(id)
  assert.deepEqual(deleted, [id])
})

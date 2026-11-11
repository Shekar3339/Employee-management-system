import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeDepartmentForm, validateDepartmentForm } from './departmentValidation.js'

test('normalizes a department form', () => {
  assert.deepEqual(normalizeDepartmentForm({ name: ' Engineering ', description: ' Build products ' }), {
    name: 'Engineering', description: 'Build products',
  })
})

test('requires a department name and enforces input limits', () => {
  const errors = validateDepartmentForm({ name: '', description: 'x'.repeat(501) })
  assert.equal(errors.name, 'Department name is required.')
  assert.equal(errors.description, 'Description must be 500 characters or fewer.')
  assert.equal(validateDepartmentForm({ name: 'x'.repeat(101), description: '' }).name, 'Department name must be 100 characters or fewer.')
})

test('allows department names with letters and optional numbers', () => {
  for (const name of ['Engineering', 'IT 101', 'R&D 2', 'Éducation 2026']) {
    assert.equal(
      validateDepartmentForm({ name, description: '' }).name,
      undefined,
      `Expected "${name}" to be accepted`,
    )
  }
})

test('rejects numeric-only and invalid department names', () => {
  for (const name of ['123', '2026', '!!!', 'Engineering_2']) {
    assert.ok(
      validateDepartmentForm({ name, description: '' }).name,
      `Expected "${name}" to be rejected`,
    )
  }
})

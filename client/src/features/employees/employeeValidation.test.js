import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeEmployeeForm, validateEmployeeForm } from './employeeValidation.js'

const validEmployee = {
  name: '  Avery Smith  ',
  email: ' AVERY@EXAMPLE.COM ',
  phone: '+1 555 0100',
  designation: '  Developer ',
  departmentId: 'department-id',
  joiningDate: '2024-01-15',
}

test('normalizes employee fields before submission', () => {
  assert.deepEqual(normalizeEmployeeForm(validEmployee), {
    ...validEmployee,
    name: 'Avery Smith',
    email: 'avery@example.com',
    phone: '+1 555 0100',
    designation: 'Developer',
  })
})

test('reports invalid employee form fields', () => {
  const errors = validateEmployeeForm({
    name: ' ', email: 'invalid', phone: 'abc', designation: '', departmentId: '', joiningDate: '2024-02-31',
  })
  assert.ok(errors.name)
  assert.ok(errors.email)
  assert.ok(errors.phone)
  assert.ok(errors.designation)
  assert.ok(errors.departmentId)
  assert.ok(errors.joiningDate)
})

test('accepts names with Unicode letters, spaces, apostrophes, and hyphens', () => {
  const errors = validateEmployeeForm({
    ...validEmployee,
    name: 'Élodie O’Connor-Smith',
  })

  assert.equal(errors.name, undefined)
})

test('rejects malformed or overlong employee names', () => {
  for (const name of ['A', 'John123', 'Mary_Smith', '  ', 'A'.repeat(101)]) {
    const errors = validateEmployeeForm({ ...validEmployee, name })
    assert.ok(errors.name, `Expected "${name}" to be rejected`)
  }
})

test('accepts letter-only designations with common separators and rejects numbers', () => {
  for (const designation of ['Senior QA/QC Engineer', 'Assistant Manager', 'Research and Development']) {
    const errors = validateEmployeeForm({ ...validEmployee, designation })
    assert.equal(errors.designation, undefined, `Expected "${designation}" to be accepted`)
  }

  for (const designation of ['X', 'Engineer 2', 'QA2', '123', '!!!', 'Developer_II', 'A'.repeat(101)]) {
    const errors = validateEmployeeForm({ ...validEmployee, designation })
    assert.ok(errors.designation, `Expected "${designation}" to be rejected`)
  }
})

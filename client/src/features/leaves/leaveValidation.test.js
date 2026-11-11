import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLeaveForm, validateLeaveForm } from './leaveValidation.js'

test('normalizes leave fields before submission', () => {
  assert.deepEqual(normalizeLeaveForm({
    leaveType: ' Annual leave ', startDate: '2024-05-10', endDate: '2024-05-11', reason: ' Family event ',
  }), {
    leaveType: 'Annual leave', startDate: '2024-05-10', endDate: '2024-05-11', reason: 'Family event',
  })
})

test('reports missing fields and invalid calendar dates', () => {
  const errors = validateLeaveForm({ leaveType: ' ', startDate: '2024-02-31', endDate: '', reason: ' ' })
  assert.ok(errors.leaveType)
  assert.ok(errors.startDate)
  assert.ok(errors.endDate)
  assert.ok(errors.reason)
})

test('reports an end date before the start date', () => {
  const errors = validateLeaveForm({
    leaveType: 'Annual leave', startDate: '2024-02-21', endDate: '2024-02-20', reason: 'Family event',
  })
  assert.equal(errors.endDate, 'End date must be on or after the start date.')
})

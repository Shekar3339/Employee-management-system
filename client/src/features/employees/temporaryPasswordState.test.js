import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import {
  copyTemporaryPassword,
  emptyTemporaryPasswordState,
  temporaryPasswordReducer,
} from './temporaryPasswordState.js'

describe('temporary password UI state', () => {
  it('opens with the password only after successful creation', () => {
    const state = temporaryPasswordReducer(emptyTemporaryPasswordState, {
      type: 'created',
      temporaryPassword: 'temporary-test-value',
    })
    assert.deepEqual(state, { open: true, temporaryPassword: 'temporary-test-value', copied: false })
  })

  it('copies only while the success modal is open', async () => {
    const state = temporaryPasswordReducer(emptyTemporaryPasswordState, {
      type: 'created',
      temporaryPassword: 'temporary-test-value',
    })
    const copiedValues = []
    const didCopy = await copyTemporaryPassword(state, { writeText: async (value) => copiedValues.push(value) })
    assert.equal(didCopy, true)
    assert.deepEqual(copiedValues, ['temporary-test-value'])

    const closedState = temporaryPasswordReducer(state, { type: 'dismiss' })
    assert.equal(await copyTemporaryPassword(closedState, { writeText: async () => assert.fail('closed modal copied') }), false)
  })

  it('clears the password on dismiss and cannot reopen the dismissed value', () => {
    const open = temporaryPasswordReducer(emptyTemporaryPasswordState, {
      type: 'created',
      temporaryPassword: 'temporary-test-value',
    })
    const dismissed = temporaryPasswordReducer(open, { type: 'dismiss' })
    assert.deepEqual(dismissed, emptyTemporaryPasswordState)
    assert.deepEqual(temporaryPasswordReducer(dismissed, { type: 'reopen' }), emptyTemporaryPasswordState)
  })

  it('keeps an empty state on failed creation and rejects missing success passwords', () => {
    assert.deepEqual(temporaryPasswordReducer(emptyTemporaryPasswordState, { type: 'failed' }), emptyTemporaryPasswordState)
    assert.deepEqual(temporaryPasswordReducer(emptyTemporaryPasswordState, { type: 'created' }), emptyTemporaryPasswordState)
  })

  it('does not reference localStorage or sessionStorage in the employee feature', async () => {
    const files = ['EmployeesPage.jsx', 'EmployeeForm.jsx', 'employeeApi.js', 'temporaryPasswordState.js']
    const sources = await Promise.all(files.map((file) => readFile(new URL(`./${file}`, import.meta.url), 'utf8')))
    assert.equal(sources.some((source) => /localStorage|sessionStorage/.test(source)), false)
  })
})

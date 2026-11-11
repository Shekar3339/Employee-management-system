import assert from 'node:assert/strict'
import test from 'node:test'
import {
  displayAttendanceStatus,
  formatDuration,
  getWorkDate,
  localDateTimeToIso,
} from './attendanceUtils.js'

test('derives work dates in the configured organization timezone', () => {
  assert.equal(getWorkDate(new Date('2026-11-10T18:45:00.000Z')), '2026-11-11')
})

test('converts correction timestamps from Asia/Kolkata local time to UTC', () => {
  assert.equal(localDateTimeToIso('2026-11-11T09:15'), '2026-11-11T03:45:00.000Z')
})

test('formats elapsed work duration and derives incomplete status for past open punches', () => {
  assert.equal(formatDuration(485), '8h 5m')
  assert.equal(displayAttendanceStatus({
    workDate: '2026-11-10',
    status: 'PRESENT',
    checkOutAt: null,
  }, '2026-11-11'), 'INCOMPLETE')
})

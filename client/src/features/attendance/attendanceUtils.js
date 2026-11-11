export const attendanceTimeZone = 'Asia/Kolkata'
const clientEnvironment = import.meta.env || {}
export const attendanceShiftStart = clientEnvironment.VITE_ATTENDANCE_SHIFT_START || '09:00'
export const attendanceGraceMinutes = Number(clientEnvironment.VITE_ATTENDANCE_GRACE_MINUTES || 15)

const [shiftHour, shiftMinute] = attendanceShiftStart.split(':').map(Number)
const cutoffMinutes = shiftHour * 60 + shiftMinute + attendanceGraceMinutes
export const attendanceLateCutoff = `${String(Math.floor(cutoffMinutes / 60) % 24).padStart(2, '0')}:${String(cutoffMinutes % 60).padStart(2, '0')}`

export function getWorkDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: attendanceTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatAttendanceDate(value) {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date)
}

export function formatAttendanceTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: attendanceTimeZone,
    timeZoneName: 'short',
  }).format(date)
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${remainder}m`
}

export function attendanceError(error, fallback) {
  if (error.response?.data?.message) return error.response.data.message
  if (Array.isArray(error.response?.data?.errors) && error.response.data.errors.length) {
    return error.response.data.errors.join(' ')
  }
  if (error.response) return `Attendance service returned HTTP ${error.response.status}.`
  if (error.request) return 'Cannot reach the attendance service. Check that the backend is running.'
  return error.message || fallback
}

export function localDateTimeToIso(value) {
  if (!value) return ''
  const date = new Date(`${value}:00+05:30`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function displayAttendanceStatus(record, today = getWorkDate()) {
  if (!record.checkOutAt && record.workDate < today) return 'INCOMPLETE'
  return record.status || 'UNKNOWN'
}

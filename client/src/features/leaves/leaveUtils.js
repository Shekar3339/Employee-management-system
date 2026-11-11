export function formatLeaveDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date)
}

export function getLeaveErrorMessage(error, fallback) {
  if (error.response?.status === 401) {
    return 'Sign in is required. Please sign in again, then refresh this page.'
  }
  if (error.response?.status === 403) {
    return 'Your account does not have permission to use this action.'
  }
  if (error.response?.data?.message) return error.response.data.message
  if (error.response?.status === 404) {
    return 'Leave service endpoint not found. Check that the backend is running the latest code.'
  }
  if (error.response) return `Leave service returned HTTP ${error.response.status}.`
  if (error.request) {
    return 'Cannot reach the leave service. Check that the backend is running and configured.'
  }
  return error.message || fallback
}

export function getApiValidationMessage(error) {
  const errors = error.response?.data?.errors
  return Array.isArray(errors) && errors.length > 0 ? errors.join(' ') : null
}

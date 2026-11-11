function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function normalizeLeaveForm(form) {
  return {
    ...form,
    leaveType: form.leaveType.trim(),
    reason: form.reason.trim(),
  }
}

export function validateLeaveForm(form) {
  const errors = {}

  if (!form.leaveType.trim()) errors.leaveType = 'Leave type is required.'
  if (!form.startDate) {
    errors.startDate = 'Start date is required.'
  } else if (!isValidDate(form.startDate)) {
    errors.startDate = 'Enter a valid start date.'
  }
  if (!form.endDate) {
    errors.endDate = 'End date is required.'
  } else if (!isValidDate(form.endDate)) {
    errors.endDate = 'Enter a valid end date.'
  }
  if (isValidDate(form.startDate) && isValidDate(form.endDate) && form.endDate < form.startDate) {
    errors.endDate = 'End date must be on or after the start date.'
  }
  if (!form.reason.trim()) errors.reason = 'Reason is required.'

  return errors
}

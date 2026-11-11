const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u
const DESIGNATION_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019./-][\p{L}\p{M}]+)*$/u
const NAME_MAX_LENGTH = 100
const DESIGNATION_MAX_LENGTH = 100

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

function isFutureDate(value) {
  const today = new Date()
  const todayValue = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year, month - 1, day) > todayValue
}

export function normalizeEmployeeForm(form) {
  return {
    ...form,
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    designation: form.designation.trim(),
  }
}

export function validateEmployeeForm(form) {
  const errors = {}

  const name = form.name.trim()
  if (!name) {
    errors.name = 'Full name is required.'
  } else if (name.length < 2 || name.length > NAME_MAX_LENGTH || !NAME_PATTERN.test(name)) {
    errors.name = 'Enter a name of 2–100 characters using letters, spaces, apostrophes, or hyphens.'
  }
  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }
  const designation = form.designation.trim()
  if (!designation) {
    errors.designation = 'Designation is required.'
  } else if (
    designation.length < 2
    || designation.length > DESIGNATION_MAX_LENGTH
    || !DESIGNATION_PATTERN.test(designation)
  ) {
    errors.designation = 'Enter a designation of 2–100 characters using letters, spaces, apostrophes, periods, slashes, or hyphens. Numbers are not allowed.'
  }
  if (!form.departmentId) errors.departmentId = 'Select a department.'
  if (!form.joiningDate) {
    errors.joiningDate = 'Joining date is required.'
  } else if (!isValidDate(form.joiningDate)) {
    errors.joiningDate = 'Enter a valid joining date.'
  } else if (isFutureDate(form.joiningDate)) {
    errors.joiningDate = 'Joining date cannot be in the future.'
  }

  return errors
}

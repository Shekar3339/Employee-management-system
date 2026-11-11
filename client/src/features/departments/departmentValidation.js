const DEPARTMENT_NAME_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} &.'\u2019()+#/-]*$/u

export function normalizeDepartmentForm(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
  }
}

export function validateDepartmentForm(form) {
  const errors = {}

  if (!form.name) {
    errors.name = 'Department name is required.'
  } else if (form.name.length > 100) {
    errors.name = 'Department name must be 100 characters or fewer.'
  } else if (
    !DEPARTMENT_NAME_PATTERN.test(form.name)
    || !/[\p{L}\p{M}]/u.test(form.name)
  ) {
    errors.name = 'Enter a department name using letters and optional numbers. A name cannot contain numbers only.'
  }

  if (form.description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  return errors
}

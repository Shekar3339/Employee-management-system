export function departmentsFromResponse(response) {
  const data = response?.data?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.departments)) return data.departments
  throw new TypeError('Departments API response must contain a department list.')
}

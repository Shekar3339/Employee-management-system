import apiClient from '../../../shared/api/client.js'

export async function getDepartments() {
  const response = await apiClient.get('/departments')
  return response.data.data
}

export async function createDepartment(department) {
  const response = await apiClient.post('/departments', department)
  return response.data.data
}

export async function updateDepartment(id, department) {
  const response = await apiClient.put(`/departments/${id}`, department)
  return response.data.data
}

export async function deleteDepartment(id) {
  const response = await apiClient.delete(`/departments/${id}`)
  return response.data.data
}

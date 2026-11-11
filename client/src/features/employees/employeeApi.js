import apiClient from '../../shared/api/client.js'
import { departmentsFromResponse } from './departmentResponse.js'

const employeePath = '/employees'

export async function listEmployees(params = {}) {
  const response = await apiClient.get(employeePath, { params })
  return response.data.data
}

export async function getEmployee(id) {
  const response = await apiClient.get(`${employeePath}/${id}`)
  return response.data.data
}

export async function getCurrentEmployeeProfile() {
  const response = await apiClient.get(`${employeePath}/me`)
  return response.data.data
}

export async function createEmployee(employee) {
  const response = await apiClient.post(employeePath, employee)
  return response.data.data
}

export async function updateEmployee(id, employee) {
  const response = await apiClient.put(`${employeePath}/${id}`, employee)
  return response.data.data
}

export async function updateEmployeeStatus(id, status) {
  const response = await apiClient.patch(`${employeePath}/${id}/status`, { status })
  return response.data.data
}

export async function listDepartments() {
  const response = await apiClient.get('/departments')
  return departmentsFromResponse(response)
}

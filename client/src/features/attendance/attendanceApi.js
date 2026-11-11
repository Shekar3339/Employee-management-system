import apiClient from '../../shared/api/client.js'

const attendancePath = '/attendance'

export async function listMyAttendance(params = {}) {
  const response = await apiClient.get(`${attendancePath}/mine`, { params })
  return response.data.data
}

export async function checkIn(notes = '') {
  const response = await apiClient.post(`${attendancePath}/check-in`, { notes })
  return response.data.data
}

export async function checkOut(notes = '') {
  const response = await apiClient.post(`${attendancePath}/check-out`, { notes })
  return response.data.data
}

export async function listMyCorrections(params = {}) {
  const response = await apiClient.get(`${attendancePath}/mine/corrections`, { params })
  return response.data.data
}

export async function requestCorrection(correction) {
  const response = await apiClient.post(`${attendancePath}/mine/corrections`, correction)
  return response.data.data
}

export async function listAttendance(params = {}) {
  const response = await apiClient.get(attendancePath, { params })
  return response.data.data
}

export async function getAttendanceSummary(params) {
  const response = await apiClient.get(`${attendancePath}/reports/summary`, { params })
  return response.data.data
}

export async function listAttendanceCorrections(params = {}) {
  const response = await apiClient.get(`${attendancePath}/corrections`, { params })
  return response.data.data
}

export async function reviewAttendanceCorrection(id, decision, reviewNote = '') {
  const response = await apiClient.patch(`${attendancePath}/corrections/${id}`, { decision, reviewNote })
  return response.data.data
}

export async function listAttendanceHolidays(params = {}) {
  const response = await apiClient.get(`${attendancePath}/holidays`, { params })
  return response.data.data
}

export async function saveAttendanceHoliday(holiday, id) {
  const response = id
    ? await apiClient.put(`${attendancePath}/holidays/${id}`, holiday)
    : await apiClient.post(`${attendancePath}/holidays`, holiday)
  return response.data.data
}

export async function deleteAttendanceHoliday(id) {
  const response = await apiClient.delete(`${attendancePath}/holidays/${id}`)
  return response.data.data
}

export async function listEmployees(params = {}) {
  const response = await apiClient.get('/employees', { params })
  return response.data.data
}

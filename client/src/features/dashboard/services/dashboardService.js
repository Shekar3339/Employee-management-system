import apiClient from '../../../shared/api/client.js'

export async function getDashboardStatistics() {
  const response = await apiClient.get('/dashboard/stats')
  return response.data
}

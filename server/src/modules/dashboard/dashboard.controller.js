import { getDashboardStatistics } from './dashboard.service.js'

export async function getDashboardStats(_request, response) {
  try {
    const statistics = await getDashboardStatistics()

    return response.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: statistics,
    })
  } catch (_error) {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve dashboard statistics.',
      errors: [],
    })
  }
}

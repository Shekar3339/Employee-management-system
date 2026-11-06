import { Router } from 'express'
import { getDashboardStats } from './dashboard.controller.js'

function authIntegrationRequired(_request, response) {
  return response.status(503).json({
    success: false,
    message:
      'Dashboard authorization is unavailable until the Authentication module is integrated.',
    errors: [],
  })
}

export function createDashboardRouter({ authenticate, authorize } = {}) {
  const router = Router()

  if (!authenticate || !authorize) {
    router.get('/stats', authIntegrationRequired)
    return router
  }

  router.get('/stats', authenticate, authorize('ADMIN'), getDashboardStats)

  return router
}

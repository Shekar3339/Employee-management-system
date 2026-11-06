import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

function sendError(response, status, message, errors = []) {
  return response.status(status).json({ success: false, message, errors })
}

function getBearerToken(request) {
  const authorization = request.get?.('authorization') ?? request.headers?.authorization
  if (typeof authorization !== 'string') return null

  const [scheme, token, ...extra] = authorization.trim().split(/\s+/)
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) return null

  return token
}

export function createAuthMiddleware({ UserModel = User, jwtClient = jwt } = {}) {
  async function authenticate(request, response, next) {
    const token = getBearerToken(request)
    if (!token) return sendError(response, 401, 'Authentication token is required')
    if (!process.env.JWT_SECRET) return sendError(response, 500, 'Authentication service is unavailable')

    try {
      const payload = jwtClient.verify(token, process.env.JWT_SECRET)
      if (!payload.sub) return sendError(response, 401, 'Invalid or expired authentication token')

      const user = await UserModel.findById(payload.sub)
      if (!user || !user.isActive) {
        return sendError(response, 401, 'Invalid or expired authentication token')
      }

      request.user = {
        id: user._id.toString(),
        role: user.role,
        employeeId: user.employeeId ? user.employeeId.toString() : null,
      }
      return next()
    } catch {
      return sendError(response, 401, 'Invalid or expired authentication token')
    }
  }

  function authorize(...roles) {
    return (request, response, next) => {
      if (!request.user) return sendError(response, 401, 'Authentication token is required')
      if (!roles.includes(request.user.role)) {
        return sendError(response, 403, 'You are not authorized to access this resource')
      }
      return next()
    }
  }

  return { authenticate, authorize }
}

const { authenticate, authorize } = createAuthMiddleware()

export { authenticate, authorize }

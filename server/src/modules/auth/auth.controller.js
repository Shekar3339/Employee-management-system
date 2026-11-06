import authService, { AuthError } from './auth.service.js'

function sendError(response, status, message, errors = []) {
  return response.status(status).json({ success: false, message, errors })
}

export function createAuthController({ service = authService } = {}) {
  async function login(request, response) {
    const { email, password } = request.body ?? {}
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return sendError(response, 400, 'Email and password are required', ['email and password are required'])
    }

    try {
      const data = await service.login({ email, password })
      return response.status(200).json({ success: true, message: 'Login successful', data })
    } catch (error) {
      if (error instanceof AuthError) return sendError(response, error.status, error.message, error.errors)
      return sendError(response, 500, 'Something went wrong')
    }
  }

  async function me(request, response) {
    try {
      const user = await service.getCurrentUser(request.user.id)
      return response.status(200).json({
        success: true,
        message: 'Current user retrieved successfully',
        data: { user },
      })
    } catch (error) {
      if (error instanceof AuthError) return sendError(response, error.status, error.message, error.errors)
      return sendError(response, 500, 'Something went wrong')
    }
  }

  return { login, me }
}

const authController = createAuthController()
export const { login, me } = authController

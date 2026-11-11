import authService, { AuthError } from './auth.service.js'

function sendError(response, status, message, errors = []) {
  return response.status(status).json({ success: false, message, errors })
}

const refreshCookieName = 'employeehub_refresh'

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers?.cookie
  if (!cookieHeader) return null
  const prefix = `${name}=`
  const value = cookieHeader.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(prefix))
  return value ? decodeURIComponent(value.slice(prefix.length)) : null
}

function setRefreshCookie(response, token) {
  if (typeof response.cookie === 'function') response.cookie(refreshCookieName, token, refreshCookieOptions())
}

function clearRefreshCookie(response) {
  if (typeof response.clearCookie === 'function') response.clearCookie(refreshCookieName, refreshCookieOptions())
}

export function createAuthController({ service = authService } = {}) {
  async function login(request, response) {
    const { email, password } = request.body ?? {}
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return sendError(response, 400, 'Email and password are required', ['email and password are required'])
    }

    try {
      const data = await service.login({ email, password })
      setRefreshCookie(response, data.refreshToken)
      return response.status(200).json({
        success: true,
        message: 'Login successful',
        data: { token: data.token, user: data.user },
      })
    } catch (error) {
      if (error instanceof AuthError) return sendError(response, error.status, error.message, error.errors)
      return sendError(response, 500, 'Something went wrong')
    }
  }

  async function refresh(request, response) {
    try {
      const data = await service.refresh(getCookie(request, refreshCookieName))
      setRefreshCookie(response, data.refreshToken)
      return response.status(200).json({
        success: true,
        message: 'Session refreshed successfully',
        data: { token: data.token, user: data.user },
      })
    } catch (error) {
      clearRefreshCookie(response)
      if (error instanceof AuthError) return sendError(response, error.status, error.message, error.errors)
      return sendError(response, 500, 'Something went wrong')
    }
  }

  async function logout(request, response) {
    try {
      await service.logout(getCookie(request, refreshCookieName))
      clearRefreshCookie(response)
      return response.status(200).json({ success: true, message: 'Signed out successfully', data: {} })
    } catch {
      clearRefreshCookie(response)
      return sendError(response, 500, 'Something went wrong')
    }
  }

  async function changePassword(request, response) {
    try {
      const data = await service.changePassword(
        request.user.id,
        request.body?.currentPassword,
        request.body?.newPassword,
      )
      setRefreshCookie(response, data.refreshToken)
      return response.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: { token: data.token, user: data.user },
      })
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

  return { login, refresh, logout, changePassword, me }
}

const authController = createAuthController()
export const { login, refresh, logout, changePassword, me } = authController

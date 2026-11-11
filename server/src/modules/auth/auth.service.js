import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'
import { RefreshSession, User } from '../../shared/models/index.js'
import { hashPassword, verifyPassword } from '../../shared/utils/password.js'

export class AuthError extends Error {
  constructor(status, message, errors = []) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId ? user.employeeId.toString() : null,
    mustChangePassword: Boolean(user.mustChangePassword),
  }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function authConfig() {
  const accessSecret = process.env.JWT_SECRET
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || accessSecret
  const accessExpiresIn = process.env.JWT_EXPIRES_IN || '15m'
  const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

  if (!accessSecret || !refreshSecret) {
    throw new AuthError(500, 'Authentication service is unavailable')
  }

  return { accessSecret, refreshSecret, accessExpiresIn, refreshExpiresIn }
}

export function createAuthService({
  UserModel = User,
  RefreshSessionModel = RefreshSession,
  verifyPasswordFn = verifyPassword,
  jwtClient = jwt,
} = {}) {
  function issueAccessToken(user, config) {
    return jwtClient.sign({ type: 'access' }, config.accessSecret, {
      subject: user._id.toString(),
      expiresIn: config.accessExpiresIn,
      algorithm: 'HS256',
      jwtid: randomUUID(),
    })
  }

  async function issueRefreshToken(user, config, replacedSession) {
    const refreshToken = jwtClient.sign({ type: 'refresh' }, config.refreshSecret, {
      subject: user._id.toString(),
      expiresIn: config.refreshExpiresIn,
      algorithm: 'HS256',
      jwtid: randomUUID(),
    })
    const payload = jwtClient.decode(refreshToken)
    const session = await RefreshSessionModel.create({
      userId: user._id,
      tokenHash: tokenHash(refreshToken),
      expiresAt: new Date(payload.exp * 1000),
    })

    if (replacedSession) {
      replacedSession.revokedAt = new Date()
      replacedSession.replacedBy = session._id
      await replacedSession.save()
    }

    return refreshToken
  }

  async function login({ email, password }) {
    const user = await UserModel.findOne({ email: normalizeEmail(email) })
    if (!user || !(await verifyPasswordFn(password, user.passwordHash)) || !user.isActive) {
      throw new AuthError(401, 'Invalid email or password')
    }
    const config = authConfig()
    return {
      token: issueAccessToken(user, config),
      refreshToken: await issueRefreshToken(user, config),
      user: toSafeUser(user),
    }
  }

  async function refresh(refreshToken) {
    if (!refreshToken) throw new AuthError(401, 'Your session has expired. Please sign in again.')
    const config = authConfig()
    let payload
    try {
      payload = jwtClient.verify(refreshToken, config.refreshSecret, { algorithms: ['HS256'] })
    } catch {
      throw new AuthError(401, 'Your session has expired. Please sign in again.')
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new AuthError(401, 'Your session has expired. Please sign in again.')
    }

    const session = await RefreshSessionModel.findOne({ tokenHash: tokenHash(refreshToken), userId: payload.sub })
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      if (session?.revokedAt) await RefreshSessionModel.updateMany({ userId: payload.sub, revokedAt: null }, { revokedAt: new Date() })
      throw new AuthError(401, 'Your session has expired. Please sign in again.')
    }

    const user = await UserModel.findById(payload.sub)
    if (!user || !user.isActive) throw new AuthError(401, 'Your session has expired. Please sign in again.')

    return {
      token: issueAccessToken(user, config),
      refreshToken: await issueRefreshToken(user, config, session),
      user: toSafeUser(user),
    }
  }

  async function logout(refreshToken) {
    if (!refreshToken) return
    const session = await RefreshSessionModel.findOne({ tokenHash: tokenHash(refreshToken) })
    if (session && !session.revokedAt) {
      session.revokedAt = new Date()
      await session.save()
    }
  }

  async function changePassword(userId, currentPassword, newPassword) {
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      throw new AuthError(400, 'Current password and new password are required')
    }
    if (newPassword.length < 8) {
      throw new AuthError(400, 'New password must be at least 8 characters long')
    }

    const user = await UserModel.findById(userId)
    if (!user || !user.isActive) throw new AuthError(401, 'Your session has expired. Please sign in again.')
    if (!(await verifyPasswordFn(currentPassword, user.passwordHash))) {
      throw new AuthError(401, 'Current password is incorrect')
    }
    if (await verifyPasswordFn(newPassword, user.passwordHash)) {
      throw new AuthError(400, 'New password must be different from the current password')
    }

    user.passwordHash = await hashPassword(newPassword)
    user.mustChangePassword = false
    await user.save()
    await RefreshSessionModel.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() })

    const config = authConfig()
    return {
      token: issueAccessToken(user, config),
      refreshToken: await issueRefreshToken(user, config),
      user: toSafeUser(user),
    }
  }

  async function getCurrentUser(userId) {
    const user = await UserModel.findById(userId)
    if (!user || !user.isActive) throw new AuthError(401, 'Invalid or expired authentication token')
    return toSafeUser(user)
  }

  return { login, refresh, logout, changePassword, getCurrentUser }
}

export default createAuthService()

import jwt from 'jsonwebtoken'
import { User } from '../../shared/models/index.js'
import { verifyPassword } from '../../shared/utils/password.js'

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
  }
}

export function createAuthService({ UserModel = User, verifyPasswordFn = verifyPassword, jwtClient = jwt } = {}) {
  async function login({ email, password }) {
    const user = await UserModel.findOne({ email: normalizeEmail(email) })
    if (!user || !(await verifyPasswordFn(password, user.passwordHash)) || !user.isActive) {
      throw new AuthError(401, 'Invalid email or password')
    }
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
      throw new AuthError(500, 'Authentication service is unavailable')
    }

    const token = jwtClient.sign({}, process.env.JWT_SECRET, {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN,
    })
    return { token, user: toSafeUser(user) }
  }

  async function getCurrentUser(userId) {
    const user = await UserModel.findById(userId)
    if (!user || !user.isActive) throw new AuthError(401, 'Invalid or expired authentication token')
    return toSafeUser(user)
  }

  return { login, getCurrentUser }
}

export default createAuthService()

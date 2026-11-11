import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.js'
import { changePassword, login, logout, me, refresh } from './auth.controller.js'

const authRouter = Router()

authRouter.post('/login', login)
authRouter.post('/refresh', refresh)
authRouter.post('/logout', logout)
authRouter.post('/change-password', authenticate, changePassword)
authRouter.get('/me', authenticate, me)

export { authRouter }

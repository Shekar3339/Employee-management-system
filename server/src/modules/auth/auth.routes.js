import { Router } from 'express'
import { authenticate } from '../../shared/middleware/auth.js'
import { login, me } from './auth.controller.js'

const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', authenticate, me)

export { authRouter }

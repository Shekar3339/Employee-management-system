import cors from 'cors'
import express from 'express'
import { authRouter } from './modules/auth/auth.routes.js'
import { createEmployeeRouter } from './modules/employees/index.js'
import { authenticate, authorize } from './shared/middleware/auth.js'
import { createLeaveRouter } from './modules/leaves/leaveRoutes.js'
import { hashPassword } from './shared/utils/password.js'

const app = express()
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
const allowedOrigins = [clientOrigin]

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173')
}

app.use(
  cors({
    origin: allowedOrigins,
  }),
)
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'employeehub-api' })
})

app.use('/api/auth', authRouter)
app.use(
  '/api/employees',
  createEmployeeRouter({ authenticate, authorize, hashPassword }),
)
app.use('/api/leaves', createLeaveRouter({ authenticate, authorize }))

export default app

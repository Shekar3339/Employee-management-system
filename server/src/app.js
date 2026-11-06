import cors from 'cors'
import express from 'express'
import { authRouter } from './modules/auth/auth.routes.js'
import { createDepartmentRouter } from './modules/departments/departmentRoutes.js'
import { authenticate, authorize } from './shared/middleware/auth.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
)
app.use(express.json())

app.use('/api/auth', authRouter)
app.use(
  '/api/departments',
  createDepartmentRouter({ authenticate, authorize }),
)

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'employeehub-api' })
})

export default app

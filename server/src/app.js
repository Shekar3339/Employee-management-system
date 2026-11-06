import cors from 'cors'
import express from 'express'
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
)
app.use(express.json())

// Authentication middleware will be injected here after the Authentication
// module exposes authenticate and authorize middleware.
app.use('/api/dashboard', createDashboardRouter())

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'employeehub-api' })
})

export default app

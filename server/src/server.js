import 'dotenv/config'
import app from './app.js'
import connectDatabase from './config/db.js'

const port = process.env.PORT || 5000

async function startServer() {
  try {
    await connectDatabase()

    app.listen(port, () => {
      console.log(`EmployeeHub API is running on http://localhost:${port}`)
    })
  } catch (error) {
    if (error.message === 'Missing MONGODB_URI environment variable.') {
      console.error(`EmployeeHub API failed to start: ${error.message}`)
    } else {
      console.error(
        'EmployeeHub API failed to start: Unable to connect to MongoDB. Check MONGODB_URI and database network access.',
      )
    }
    process.exit(1)
  }
}

startServer()

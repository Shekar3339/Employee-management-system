import mongoose from 'mongoose'

let connectionPromise

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (connectionPromise) {
    return connectionPromise
  }

  const mongoUri = process.env.MONGODB_URI

  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI environment variable.')
  }

  connectionPromise = mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB.')
      return mongoose.connection
    })
    .catch((error) => {
      connectionPromise = undefined
      throw error
    })

  return connectionPromise
}

export default connectDatabase

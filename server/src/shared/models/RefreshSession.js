import mongoose from 'mongoose'

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshSession', default: null },
  },
  { timestamps: true, collection: 'refreshSessions' },
)

const RefreshSession = mongoose.models.RefreshSession
  || mongoose.model('RefreshSession', refreshSessionSchema)

export default RefreshSession

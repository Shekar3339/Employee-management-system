import mongoose from 'mongoose'

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    workDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    requestedCheckInAt: {
      type: Date,
      default: null,
    },
    requestedCheckOutAt: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    before: {
      checkInAt: { type: Date, default: null },
      checkOutAt: { type: Date, default: null },
    },
    after: {
      checkInAt: { type: Date, default: null },
      checkOutAt: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: 'attendance_corrections' },
)

attendanceCorrectionSchema.index({ employeeId: 1, workDate: -1 })
attendanceCorrectionSchema.index(
  { employeeId: 1, workDate: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } },
)

const AttendanceCorrection =
  mongoose.models.AttendanceCorrection
  || mongoose.model('AttendanceCorrection', attendanceCorrectionSchema)

export default AttendanceCorrection

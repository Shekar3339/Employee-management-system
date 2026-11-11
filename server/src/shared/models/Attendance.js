import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema(
  {
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
    checkInAt: {
      type: Date,
      required: true,
    },
    checkOutAt: {
      type: Date,
      default: null,
    },
    workDurationMinutes: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'LATE', 'INCOMPLETE'],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true, collection: 'attendance' },
)

attendanceSchema.index({ employeeId: 1, workDate: 1 }, { unique: true })
attendanceSchema.index({ workDate: -1, status: 1 })

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)

export default Attendance

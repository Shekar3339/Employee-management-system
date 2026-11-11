import mongoose from 'mongoose'

const attendanceHolidaySchema = new mongoose.Schema(
  {
    workDate: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true, collection: 'attendance_holidays' },
)

const AttendanceHoliday =
  mongoose.models.AttendanceHoliday
  || mongoose.model('AttendanceHoliday', attendanceHolidaySchema)

export default AttendanceHoliday

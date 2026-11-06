import 'dotenv/config'
import { createHmac, randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import connectDatabase from '../../config/db.js'
import { Department, Employee, Leave, User } from '../../shared/models/index.js'

const demoEmail = 'demo.employee@employeehub.local'
const demoName = 'EmployeeHub Demo Employee'
const demoDepartmentName = 'EmployeeHub Demo Department'

function dateAfterDays(days) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function createDemoToken(userId, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const now = Math.floor(Date.now() / 1000)
  const payload = encode({ sub: userId, iat: now, exp: now + 60 * 60 })
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

async function seedLeaveDemoData() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to create a test token.')
  }

  await connectDatabase()
  try {
    const department =
      (await Department.findOne({ name: demoDepartmentName })) ||
      (await Department.create({
        name: demoDepartmentName,
        description: 'Department for EmployeeHub leave-management demo data.',
      }))

    let user = await User.findOne({ email: demoEmail })
    if (user) {
      if (user.name !== demoName || user.role !== 'EMPLOYEE' || !user.isActive) {
        throw new Error(`The reserved demo account ${demoEmail} already exists with different details.`)
      }
    } else {
      const randomPassword = randomBytes(32).toString('hex')
      user = await User.create({
        name: demoName,
        email: demoEmail,
        passwordHash: await bcrypt.hash(randomPassword, 12),
        role: 'EMPLOYEE',
        isActive: true,
      })
    }

    let employee = await Employee.findOne({ email: demoEmail })
    if (employee && employee.userId.toString() !== user._id.toString()) {
      throw new Error(`The reserved demo employee ${demoEmail} is linked to a different user.`)
    }

    if (!employee) {
      employee = await Employee.create({
        userId: user._id,
        name: demoName,
        email: demoEmail,
        designation: 'Demo Team Member',
        departmentId: department._id,
        joiningDate: new Date('2026-01-01T00:00:00.000Z'),
        status: 'ACTIVE',
      })
    } else if (employee.status !== 'ACTIVE') {
      throw new Error(`The reserved demo employee ${demoEmail} is inactive.`)
    }

    if (user.employeeId?.toString() !== employee._id.toString()) {
      user.employeeId = employee._id
      await user.save()
    }

    const samples = [
      { days: 14, duration: 2, leaveType: 'Annual leave' },
      { days: 35, duration: 1, leaveType: 'Personal leave' },
      { days: 60, duration: 3, leaveType: 'Sick leave' },
    ]

    let inserted = 0
    for (const sample of samples) {
      const startDate = dateAfterDays(sample.days)
      const endDate = dateAfterDays(sample.days + sample.duration - 1)
      const reason = `Demo seed: ${sample.leaveType.toLowerCase()}`
      const result = await Leave.updateOne(
        { employeeId: employee._id, reason },
        {
          $setOnInsert: {
            employeeId: employee._id,
            leaveType: sample.leaveType,
            startDate,
            endDate,
            reason,
            status: 'PENDING',
          },
        },
        { upsert: true, runValidators: true },
      )
      inserted += result.upsertedCount
    }

    console.log(`Demo employee: ${demoEmail}`)
    console.log(`Demo department: ${demoDepartmentName}`)
    console.log(`Leave requests added: ${inserted} (3 available for this employee).`)
    console.log('Temporary test token (expires in 1 hour):')
    console.log(createDemoToken(user._id.toString(), process.env.JWT_SECRET))
  } finally {
    await mongoose.disconnect()
  }
}

seedLeaveDemoData().catch((error) => {
  console.error(`Leave demo seed failed: ${error.message}`)
  process.exitCode = 1
})

import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../src/config/db.js";
import { Department, Employee, User } from "../src/shared/models/index.js";
import { hashPassword, verifyPassword } from "../src/shared/utils/password.js";

const demoAccounts = [
  {
    name: "EmployeeHub Demo Admin",
    email: "admin@employeehub.local",
    password: "AdminDemo!2026",
    role: "ADMIN",
  },
  {
    name: "EmployeeHub Demo Employee",
    email: "employee@employeehub.local",
    password: "EmployeeDemo!2026",
    role: "EMPLOYEE",
  },
];

async function ensureDemoUser({ name, email, password, role }, department) {
  let user = await User.findOne({ email });

  if (user) {
    if (
      user.role !== role ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      throw new Error(`Refusing to overwrite the existing ${email} account.`);
    }
  } else {
    user = await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      employeeId: null,
      isActive: true,
    });
  }

  if (!user.isActive) {
    throw new Error(
      `The existing ${email} account is inactive; activate it before using the demo login.`,
    );
  }

  if (role === "EMPLOYEE") {
    let employee = await Employee.findOne({ userId: user._id });
    if (!employee) {
      employee = await Employee.create({
        userId: user._id,
        name,
        email,
        designation: "Demo Employee",
        departmentId: department._id,
        joiningDate: new Date(),
        status: "ACTIVE",
      });
    }

    if (!user.employeeId || !user.employeeId.equals(employee._id)) {
      user.employeeId = employee._id;
      await user.save();
    }
  }
}

async function seedDemoUsers() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.DEMO_SEED_ENABLED !== "true"
  ) {
    throw new Error(
      "Demo seeding is disabled. Set DEMO_SEED_ENABLED=true in a local development environment.",
    );
  }

  await connectDatabase();
  const department = await Department.findOneAndUpdate(
    { name: "EmployeeHub Demo" },
    {
      $setOnInsert: {
        description: "Department for local authentication demonstrations.",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  for (const account of demoAccounts) {
    await ensureDemoUser(account, department);
  }

  console.log("Demo admin and employee accounts are ready.");
}

try {
  await seedDemoUsers();
} catch (error) {
  console.error(`Unable to seed demo accounts: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

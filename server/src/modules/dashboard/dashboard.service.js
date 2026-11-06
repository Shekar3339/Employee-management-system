import { Department, Employee, Leave } from '../../shared/models/index.js'

export async function getDashboardStatistics({
  EmployeeModel = Employee,
  DepartmentModel = Department,
  LeaveModel = Leave,
} = {}) {
  const [totalEmployees, activeEmployees, totalDepartments, pendingLeaves] =
    await Promise.all([
      EmployeeModel.countDocuments(),
      EmployeeModel.countDocuments({ status: 'ACTIVE' }),
      DepartmentModel.countDocuments(),
      LeaveModel.countDocuments({ status: 'PENDING' }),
    ])

  return {
    totalEmployees,
    activeEmployees,
    totalDepartments,
    pendingLeaves,
  }
}

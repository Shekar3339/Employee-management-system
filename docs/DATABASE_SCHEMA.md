# EmployeeHub Database Schema

EmployeeHub uses one shared MongoDB Atlas database named `employeehub`. All schemas use Mongoose timestamps, creating `createdAt` and `updatedAt` fields.

## Collections and models

### `users` — `User`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | Required, trimmed |
| `email` | String | Required, trimmed, lowercase, unique |
| `passwordHash` | String | Required; passwords are stored only as hashes |
| `role` | String | Required enum: `ADMIN`, `EMPLOYEE` |
| `employeeId` | ObjectId | Nullable reference to `Employee`; `null` for admins |
| `isActive` | Boolean | Defaults to `true` |

### `employees` — `Employee`

| Field | Type | Rules |
| --- | --- | --- |
| `userId` | ObjectId | Required reference to `User` |
| `name` | String | Required, trimmed |
| `email` | String | Required, trimmed, lowercase; must match the linked User email, enforced by the employee service |
| `phone` | String | Optional |
| `designation` | String | Required |
| `departmentId` | ObjectId | Required reference to `Department` |
| `joiningDate` | Date | Required |
| `status` | String | Enum: `ACTIVE`, `INACTIVE`; defaults to `ACTIVE` |

Employees are retained for normal workflows rather than physically deleted.

### `departments` — `Department`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | Required, trimmed, unique |
| `description` | String | Optional |

Departments do not store employee arrays; employees point to their department.

### `leaves` — `Leave`

| Field | Type | Rules |
| --- | --- | --- |
| `employeeId` | ObjectId | Required reference to `Employee` |
| `leaveType` | String | Required |
| `startDate` | Date | Required |
| `endDate` | Date | Required |
| `reason` | String | Required |
| `status` | String | Enum: `PENDING`, `APPROVED`, `REJECTED`; defaults to `PENDING` |
| `reviewedBy` | ObjectId | Nullable reference to `User` |
| `reviewedAt` | Date | Nullable |

Authorization, employee ownership, and date validation are enforced by the Leave module.

## Relationships

- `User._id` → `Employee.userId`
- `Department._id` → `Employee.departmentId`
- `Employee._id` → `Leave.employeeId`
- `User._id` → `Leave.reviewedBy`

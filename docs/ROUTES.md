# EmployeeHub Route Map

All backend routes are prefixed with `/api`.

## Frontend pages

| Route | Responsibility | Access |
| --- | --- | --- |
| `/login` | Sign in with an active account | Public |
| `/admin/dashboard` | Administrator landing page | `ADMIN` |
| `/employee/profile` | Employee profile and leave management | `EMPLOYEE` |

## Authentication

| Method | Route | Responsibility | Authentication |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate an active user by email and password; return `data: { token, user }` | Public; no registration route exists |
| `GET` | `/api/auth/me` | Get the current authenticated user; return `data: { user }` | JWT required via shared `authenticate` middleware |

Authentication supports only `ADMIN` and `EMPLOYEE`. The JWT subject is the User MongoDB ID. Trusted authentication context has the form `{ id, role, employeeId }`; `employeeId` comes from the database, with `null` for an admin and the linked Employee ID for an employee.

Shared middleware is exported from `server/src/shared/middleware/auth.js` as `authenticate` and `authorize`. Shared password functions are exported from `server/src/shared/utils/password.js` as `hashPassword` and `verifyPassword`.

## Employee Management

| Method | Route | Responsibility |
| --- | --- | --- |
| `GET` | `/api/employees` | List employees |
| `POST` | `/api/employees` | Create an employee through the agreed employee creation workflow |
| `GET` | `/api/employees/me` | Get the current employee record |
| `GET` | `/api/employees/:id` | Get an employee by ID |
| `PUT` | `/api/employees/:id` | Update an employee by ID |
| `PATCH` | `/api/employees/:id/status` | Update an employee status |

## Department Management

| Method | Route | Responsibility |
| --- | --- | --- |
| `GET` | `/api/departments` | List departments |
| `POST` | `/api/departments` | Create a department |
| `PUT` | `/api/departments/:id` | Update a department by ID |
| `DELETE` | `/api/departments/:id` | Delete a department by ID |

## Leave Management

| Method | Route | Responsibility |
| --- | --- | --- |
| `POST` | `/api/leaves` | Submit a leave request |
| `GET` | `/api/leaves/mine` | Get the authenticated employee's leave requests |
| `GET` | `/api/leaves` | List leave requests |
| `PATCH` | `/api/leaves/:id/status` | Update a leave request status |

## Dashboard

| Method | Route | Responsibility |
| --- | --- | --- |
| `GET` | `/api/dashboard/stats` | Get dashboard statistics |

## Access-control boundary

JWT authentication and role checks apply to protected routes. `EMPLOYEE` users must not access admin APIs or pages. This route map deliberately does not assign an endpoint-by-endpoint admin/employee matrix outside the two auth routes, because that matrix has not been specified in the agreed requirements.

No endpoints other than those listed in this document are agreed.

# EmployeeHub API Contract

All API endpoints are prefixed with `/api` and return JSON.

## Standard response envelope

Success responses use `{ "success": true, "message": "...", "data": {} }`.
Error responses use `{ "success": false, "message": "...", "errors": [] }`.
Use the applicable HTTP status code: `200`, `201`, `400`, `401`, `403`, `404`, `409`, or `500`.

## Authentication and RBAC

- Roles are `ADMIN` and `EMPLOYEE`.
- Authentication uses JWT and the shared `users` collection. Passwords are stored only as bcrypt `passwordHash` values.
- Shared middleware exports `authenticate` and `authorize(...roles)` from `server/src/shared/middleware/auth.js`.
- Authenticated requests receive `req.user = { id, role, employeeId }`, sourced from trusted JWT/database data.
- Shared password functions `hashPassword` and `verifyPassword` are exported from `server/src/shared/utils/password.js`.
- An inactive user cannot authenticate. There is no public registration endpoint.

## Authentication endpoints

### `POST /api/auth/login`

Authenticates an active user from `{ "email", "password" }` and returns HTTP `200` with `data: { token, user }`.

### `GET /api/auth/me`

Requires JWT authentication and returns HTTP `200` with `data: { user }`.

## Dashboard

### `GET /api/dashboard/stats`

Returns dashboard summary statistics for administrators.

- Required middleware interface: `authenticate(req, res, next)` followed by `authorize('ADMIN')`.
- Required authenticated user contract: `req.user = { id, role, employeeId }`.
- The endpoint is mounted with shared authentication middleware and is inaccessible to employees.

Success response (`200`):

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalEmployees": 0,
    "activeEmployees": 0,
    "totalDepartments": 0,
    "pendingLeaves": 0
  }
}
```

Error response:

```json
{
  "success": false,
  "message": "Readable error message",
  "errors": []
}
```

## Module endpoint responsibilities

| Module | Endpoints |
| --- | --- |
| Authentication | `POST /api/auth/login`, `GET /api/auth/me` |
| Dashboard | `GET /api/dashboard/stats` |
| Employee Management | `GET /api/employees`, `POST /api/employees`, `GET /api/employees/me`, `GET /api/employees/:id`, `PUT /api/employees/:id`, `PATCH /api/employees/:id/status` |
| Department Management | `GET /api/departments`, `POST /api/departments`, `PUT /api/departments/:id`, `DELETE /api/departments/:id` |
| Leave Management | `POST /api/leaves`, `GET /api/leaves/mine`, `GET /api/leaves`, `PATCH /api/leaves/:id/status` |

# EmployeeHub API Contract

All API endpoints are prefixed with `/api`. The API returns JSON.

## Standard response envelope

Successful responses use this structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Error responses use this structure:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": []
}
```

Use the applicable HTTP status code: `200`, `201`, `400`, `401`, `403`, `404`, `409`, or `500`.

## Authentication and RBAC

- The only roles are `ADMIN` and `EMPLOYEE`.
- Both roles authenticate against the shared `users` collection through the existing shared `User` model.
- Login uses email and password. Passwords are stored only as bcrypt `passwordHash` values.
- Authentication uses JWT. The JWT subject is the MongoDB User ID.
- An inactive user cannot authenticate.
- There is no public registration endpoint.
- Authenticated requests populate `req.user` from trusted JWT/database data only:

  ```js
  { id, role, employeeId }
  ```

- `employeeId` always comes from the database, never from a request body.
- An `ADMIN` has `employeeId: null`; an `EMPLOYEE` has the ID of the linked Employee document.
- Employees must not be allowed to access admin APIs or pages.

## Auth endpoints

### `POST /api/auth/login`

Authenticates an active `ADMIN` or `EMPLOYEE` using email and password and issues JWT-based authentication.

Request body:

```json
{
  "email": "user@example.com",
  "password": "plain-text-password"
}
```

The request password is used only for bcrypt comparison and must never be persisted or returned. A successful response is HTTP `200` and uses this exact `data` shape:

```json
{
  "token": "jwt",
  "user": {
    "id": "user-id",
    "name": "Name",
    "email": "user@example.com",
    "role": "ADMIN",
    "employeeId": null
  }
}
```

### `GET /api/auth/me`

Requires JWT authentication. The shared middleware exports `authenticate` and `authorize` from `server/src/shared/middleware/auth.js`; it verifies the token, loads the User record, and attaches exactly `{ id, role, employeeId }` to `req.user`. The current-user response is HTTP `200` with this exact `data` shape:

```json
{
  "user": {
    "id": "user-id",
    "name": "Name",
    "email": "user@example.com",
    "role": "ADMIN",
    "employeeId": null
  }
}
```

Password functions are exported as `hashPassword` and `verifyPassword` from `server/src/shared/utils/password.js`.

## Module endpoint responsibilities

| Module | Responsibility | Endpoints |
| --- | --- | --- |
| Authentication | Login, current-user identity, JWT authentication, and RBAC support | `POST /api/auth/login`, `GET /api/auth/me` |
| Employee Management | Employee records and the agreed employee-account creation workflow | `GET /api/employees`, `POST /api/employees`, `GET /api/employees/me`, `GET /api/employees/:id`, `PUT /api/employees/:id`, `PATCH /api/employees/:id/status` |
| Department Management | Department records | `GET /api/departments`, `POST /api/departments`, `PUT /api/departments/:id`, `DELETE /api/departments/:id` |
| Leave Management | Leave submission, personal leave access, leave administration, and leave status updates | `POST /api/leaves`, `GET /api/leaves/mine`, `GET /api/leaves`, `PATCH /api/leaves/:id/status` |
| Dashboard | Dashboard statistics | `GET /api/dashboard/stats` |

No endpoint beyond those listed in this document is part of the agreed API contract.

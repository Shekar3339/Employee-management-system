# EmployeeHub Authentication Module

This module handles sign-in, JWT authentication, and role-based access control for EmployeeHub.

## What it does

- Lets active users sign in with email and password.
- Supports two roles: `ADMIN` and `EMPLOYEE`.
- Stores passwords only as bcrypt hashes (`passwordHash`).
- Creates JWTs after a successful login.
- Protects backend routes using a Bearer token.
- Loads the current user from MongoDB for every protected request.
- Stops inactive or deleted users from using protected APIs.
- Provides reusable role checks with `authorize(...roles)`.

There is no public registration endpoint. Admin accounts are seeded by the team lead, and employee accounts are created through the employee workflow.

## Main files

| File | Purpose |
| --- | --- |
| `server/src/modules/auth/auth.routes.js` | Defines the auth API routes. |
| `server/src/modules/auth/auth.controller.js` | Validates requests and sends API responses. |
| `server/src/modules/auth/auth.service.js` | Handles login, JWT creation, and safe user data. |
| `server/src/shared/middleware/auth.js` | Exports `authenticate` and `authorize`. |
| `server/src/shared/utils/password.js` | Exports bcrypt password helpers. |
| `client/src/features/auth/` | Contains the login UI, auth state, and protected-route helper. |

## Login process

```text
User enters email and password
        ↓
POST /api/auth/login
        ↓
Email is trimmed and converted to lowercase
        ↓
User is found in the shared users collection
        ↓
bcrypt compares the entered password with passwordHash
        ↓
Active user receives a JWT with the User ID as its subject
        ↓
Frontend receives { token, user }
        ↓
User is sent to the correct role destination
```

Role destinations in the frontend are:

- `ADMIN` → `/admin/dashboard`
- `EMPLOYEE` → `/employee/profile`

## API reference

### Login

`POST /api/auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "ADMIN",
      "employeeId": null
    }
  }
}
```

Common errors:

| Status | When it happens |
| --- | --- |
| `400` | Email or password is missing. |
| `401` | Email/password is incorrect, or the account is inactive. |
| `500` | Authentication environment configuration is unavailable. |

### Current user

`GET /api/auth/me`

Send the JWT in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

Successful response (`200`):

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "EMPLOYEE",
      "employeeId": "employee-document-id"
    }
  }
}
```

## Route protection and roles

Use `authenticate` first on any protected backend route. It verifies the JWT, loads the latest User record, and sets:

```js
req.user = {
  id: 'user-id',
  role: 'ADMIN',
  employeeId: null,
}
```

Then use `authorize` to restrict the route by role:

```js
import { authenticate, authorize } from '../shared/middleware/auth.js'

router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
```

`employeeId` is always read from the database. It is `null` for admins and the linked Employee ID for employees.

## Password helpers

```js
import { hashPassword, verifyPassword } from '../shared/utils/password.js'
```

- `hashPassword(password)` creates a bcrypt hash using 12 salt rounds.
- `verifyPassword(password, passwordHash)` compares a user-entered password against its stored hash.

Never return, log, or place `passwordHash` in a JWT or API response.

## Environment values

The server requires:

```env
JWT_SECRET=team-approved-secret
JWT_EXPIRES_IN=1d
```

`MONGODB_URI` is also required by the server to load User records from the shared `employeehub` database.

## Testing

Run backend authentication tests from the `server` folder:

```bash
npm test
```

The authentication tests cover password hashing, successful admin/employee login, invalid credentials, inactive users, missing and invalid tokens, expired tokens, deleted users, current-user retrieval, role authorization, and password-hash exclusion.

## Integration

The server application mounts the auth router at `/api/auth`:

```js
import { authRouter } from './modules/auth/auth.routes.js'

app.use('/api/auth', authRouter)
```

The frontend uses the shared Axios client for auth requests. The JWT stays in React auth state; session persistence is not implemented.

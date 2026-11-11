# EmployeeHub Route Map

All backend routes are prefixed with `/api`.

## Frontend routes

| Route | Owner | Access | Current state |
| --- | --- | --- | --- |
| `/login` | Authentication | Public | Implemented |
| `/dashboard` | Team Lead | `ADMIN` | Implemented |
| `/employees` | Employee Management | `ADMIN` | Implemented |
| `/departments` | Department Management | Authenticated user | Implemented; management actions are `ADMIN` only |
| `/leaves` | Leave Management | `EMPLOYEE` | Implemented |
| `/profile` | Authentication | `EMPLOYEE` | Temporary profile boundary |

The Team Lead owns central route configuration, shared layout, and integration. Authentication owns authenticated user state and role-aware route boundaries.

## Backend routes

| Method | Route | Access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/refresh` | Refresh-cookie session |
| `POST` | `/api/auth/logout` | Refresh-cookie session |
| `POST` | `/api/auth/change-password` | Authenticated |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/dashboard/stats` | `ADMIN` |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/departments` | Authenticated list; `ADMIN` writes |
| `GET`, `POST` | `/api/employees` | `ADMIN` |
| `GET` | `/api/employees/me` | `EMPLOYEE` |
| `GET`, `PUT` | `/api/employees/:id` | `ADMIN` |
| `PATCH` | `/api/employees/:id/status` | `ADMIN` |
| `POST` | `/api/leaves` | `EMPLOYEE` |
| `GET` | `/api/leaves/mine` | `EMPLOYEE` |
| `GET` | `/api/leaves` | `ADMIN` |
| `PATCH` | `/api/leaves/:id/status` | `ADMIN` |

# Frontend routes

| Route | Owner | Access | Current state |
| --- | --- | --- | --- |
| `/login` | Authentication | Public | Temporary boundary pending Authentication module |
| `/dashboard` | Team Lead | `ADMIN` | Dashboard page implemented; requires Authentication integration |
| `/employees` | Employee Management | `ADMIN` | Temporary placeholder |
| `/departments` | Department Management | `ADMIN` | Temporary placeholder |
| `/leaves` | Leave Management | Authenticated user | Temporary placeholder |
| `/profile` | Authentication | Authenticated user | Temporary placeholder |

The Team Lead owns central route configuration, shared layout, protected-route boundaries, navigation, loading, and error components. The Authentication module must supply the authenticated user state and enforce role-aware route access.

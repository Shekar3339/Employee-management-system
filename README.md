# EmployeeHub

EmployeeHub is a simple full-stack Employee Management System built by a five-person team. This repository provides the shared project foundation; feature modules will be added independently by their assigned owners.

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A MongoDB Atlas connection string when the database setup phase begins

## Setup

1. Install the frontend dependencies:

   ```bash
   cd client
   npm install
   ```

2. Install the backend dependencies:

   ```bash
   cd ../server
   npm install
   ```

3. Copy each example environment file and set values for your machine:

   ```bash
   copy client\\.env.example client\\.env
   copy server\\.env.example server\\.env
   ```

   Database credentials are intentionally not configured in this foundation.

## Run locally

Open two terminals from the repository root:

```bash
npm run client
```

The React application runs at `http://localhost:5173`.

```bash
npm run server
```

The API runs at `http://localhost:5000`. Verify it at `GET /api/health`.

Authentication is available at `/api/auth`; the frontend provides `/login`,
`/admin/dashboard`, and `/employee/profile`. The Leave Management API at
`/api/leaves` and protected frontend routes use the AuthContext JWT. Sign in
with an active account to access the employee leave page.

The Attendance module is available at `/api/attendance` and `/attendance`.
Employees can record their own punches and request corrections; admins can
review all attendance, approve corrections, manage holidays, and view summary
reports. Attendance work dates use Asia/Kolkata. Keep
`ATTENDANCE_SHIFT_START` / `ATTENDANCE_GRACE_MINUTES` in the server environment
aligned with `VITE_ATTENDANCE_SHIFT_START` / `VITE_ATTENDANCE_GRACE_MINUTES` in
the client environment; defaults are 09:00 and 15 minutes. Employee endpoints
include `/mine`, `/mine/corrections`, `/check-in`, and `/check-out`; admin
endpoints include attendance reports, correction review, and holiday management.

To create a separate demo department, employee account, and three leave
requests, run:

```bash
npm --prefix server run seed:leaves
```

The seed command creates only the reserved `demo.employee@employeehub.local`
account and clearly labeled records. It never removes existing records and
prints a one-hour test JWT for that demo employee. The demo password is random
and not printed; use the temporary token to test the leave page.

## Project structure

- `client/` — React + Vite frontend
- `server/` — Express API
- `docs/` — shared team contracts and planning documents

See [AGENTS.md](AGENTS.md) for architecture, ownership, and Git collaboration rules.

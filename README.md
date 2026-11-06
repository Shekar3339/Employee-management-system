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

## Project structure

- `client/` — React + Vite frontend
- `server/` — Express API
- `docs/` — shared team contracts and planning documents

See [AGENTS.md](AGENTS.md) for architecture, ownership, and Git collaboration rules.

# EmployeeHub Development Guide

## Technology

- Frontend: React + Vite, React Router, Axios, Lucide React
- Backend: Node.js + Express using ES modules
- Database: one shared MongoDB Atlas database named `employeehub` (Mongoose will be configured in the database setup phase)
- Authentication: JWT and bcryptjs (owned by the Authentication module)

## Architecture

- `client/src/app/` contains shared app entry points owned by the team lead.
- `client/src/shared/` contains reusable infrastructure such as the Axios client.
- `client/src/features/` contains independent frontend feature modules.
- `server/src/app.js` and `server/src/server.js` are shared backend entry points owned by the team lead.
- `server/src/shared/` contains reusable backend infrastructure.
- `server/src/modules/` contains independent backend feature modules.
- Each module has frontend and backend placeholder folders. Do not add another database or duplicate app entry points.

## Module ownership

| Owner | Module |
| --- | --- |
| Team Lead | Project foundation and Dashboard |
| Member 2 | Authentication |
| Member 3 | Employee Management |
| Member 4 | Leave Management |
| Member 5 | Department Management |

## Git rules

1. Work on your assigned feature branch only.
2. Do not modify another module without coordinating with its owner.
3. Keep shared-entry-point changes (`client/src/main.jsx`, `client/src/app/`, `server/src/app.js`, `server/src/server.js`, shared configuration) with the team lead.
4. Pull and resolve conflicts before opening a pull request.
5. Keep commits focused and do not commit `.env`, `node_modules`, or credentials.
6. Do not overwrite existing Git configuration or force-push shared branches.

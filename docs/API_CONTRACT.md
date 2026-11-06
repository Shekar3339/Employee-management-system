# API Contract

## Dashboard

### `GET /api/dashboard/stats`

Returns dashboard summary statistics for administrators.

- Required middleware interface: `authenticate(req, res, next)` followed by `authorize('ADMIN')`.
- Required authenticated user contract: `req.user = { id, role, employeeId }`.
- Until the Authentication module supplies that middleware, the route fails closed with `503` and does not expose statistics.

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

[← Project overview](../README.md) · [All documentation](../README.md#documentation)

# Shared response contract

Successful JSON responses include success: true. Error responses include success: false and error: { message, details }. Lists include data and meta. HTTP 204 has no response body.

# Taskflow API

Base: `http://localhost:5000/api`. JSON request bodies, with `Content-Type: application/json`. The frontend proxies the same paths through port 5173.

## Authentication

POST `/auth/login` with `{ "email": "admin@taskflow.local", "password": "Taskflow123!" }`. Returns `{data: user}` and sets HttpOnly `taskflow_token`. Postman and browsers should retain/send the cookie. GET `/auth/me` returns the current public user. POST `/auth/logout` clears the cookie and returns 204. All remaining endpoints require authentication. Password hashes are never returned.

## Endpoints

| Method | Path                         | Access / body                                                                        |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------ |
| GET    | /health                      | Public DB connectivity check                                                         |
| GET    | /projects                    | Scoped, paginated; page, limit, search, status                                       |
| POST   | /projects                    | Admin/Manager; name, description?, status?, managerId (Admin required)               |
| GET    | /projects/:id                | Scoped detail, task summary and scoped members                                       |
| PATCH  | /projects/:id                | Admin/scoped Manager; name?, description?, status?, managerId? (Admin transfer only) |
| DELETE | /projects/:id                | Admin only; soft deletion                                                            |
| PUT    | /projects/:id/members        | Admin/scoped Manager; userId, teamLeadId? (null permitted)                           |
| DELETE | /projects/:id/members        | Admin/scoped Manager; userId                                                         |
| GET    | /tasks                       | Scoped combined search/filter/sort/pagination                                        |
| POST   | /tasks                       | Admin/Manager/Lead in scope; task fields below                                       |
| GET    | /tasks/:id                   | Scoped detail                                                                        |
| PATCH  | /tasks/:id                   | Scoped update; employee status/reason only                                           |
| DELETE | /tasks/:id                   | Admin/scoped Manager; soft deletion                                                  |
| GET    | /tasks/:id/comments          | Scoped; page, limit                                                                  |
| POST   | /tasks/:id/comments          | Scoped; body (1–4000 chars)                                                          |
| GET    | /tasks/:id/activity          | Scoped; page, limit                                                                  |
| GET    | /dashboard                   | All scoped aggregates, workload and first project performance page                   |
| GET    | /reports/workload            | Top five active employees by incomplete visible tasks                                |
| GET    | /reports/project-performance | Scoped project aggregation; page, limit                                              |
| GET    | /users/options               | Scoped/public-field directory; search, role, page, limit                             |
| GET    | /users                       | Admin; search, role, active, page, limit                                             |
| POST   | /users                       | Admin; name, email, password (10–128), role?                                         |
| PATCH  | /users/:id                   | Admin; name?, email?, password?, role?, active?                                      |

## Task request

```json
{
  "projectId": "PROJECT_UUID",
  "title": "Implement payment callback",
  "description": "Verify the callback and record an activity entry.",
  "status": "TODO",
  "priority": "HIGH",
  "assigneeId": "PROJECT_MEMBER_UUID",
  "dueDate": "2026-11-10",
  "blockedReason": null
}
```

Creation requires projectId and title (3–200). Description defaults to empty; status defaults to TODO; priority defaults to MEDIUM; assignee/due date default to null. PATCH accepts editable fields without projectId. Task project cannot be changed. Unknown fields are rejected. Completing sets completed_at; a transition to BLOCKED requires a non-blank blockedReason. Reopening requires Admin or assigned Manager.

Enums:

- Task status: TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, BLOCKED.
- Priority: LOW, MEDIUM, HIGH, CRITICAL.
- Project status: PLANNING, ACTIVE, ON_HOLD, COMPLETED.
- Role: ADMIN, MANAGER, TEAM_LEAD, EMPLOYEE.

## Combined search example

```text
GET /api/tasks?page=1&limit=20&search=payment&projectId=PROJECT_UUID&assigneeId=USER_UUID&status=IN_PROGRESS&priority=HIGH&dueFrom=2026-11-01&dueTo=2026-11-30&overdue=true&sortBy=dueDate&sortOrder=asc
```

All filters are optional and combine with authorization. Search covers task title, description, project name and assignee name. Dates are strict YYYY-MM-DD; lower range cannot exceed upper. Page >=1, limit 1–100. sortBy is dueDate, createdAt, updatedAt, title, status or priority. sortOrder is asc/desc. UUID parameters are validated. `%`, `_` and backslash in text searches are literal characters.

## Responses

Single record: `{ "data": { ... } }`. Paginated records: `{ "data": [], "meta": { "total": 20000, "page": 1, "limit": 20 } }`. Task records use database-style snake_case fields (`project_id`, `assignee_id`, `due_date`, `completed_at`) and include `project_name`/`assignee_name`. Request fields use camelCase as above. Dates/timestamps are ISO-compatible strings.

Create returns 201; successful reads/updates return 200; deletes/logout return 204 without a body. Errors: `{ "success": false, "error": { "message": "...", "details": [] } }`. Validation 400, unauthenticated 401, prohibited role 403, missing/out-of-scope resource 404, duplicate/reference conflict 409, rate limit 429. Internal failures return a generic 500 without a stack trace.

## PowerShell example

```powershell
$session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login=@{email='manager@taskflow.local';password='Taskflow123!'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/auth/login' -WebSession $session -ContentType 'application/json' -Body $login
$projects=Invoke-RestMethod -Uri 'http://localhost:5000/api/projects?limit=20' -WebSession $session
$projects.data | Select-Object id,name
Invoke-RestMethod -Uri 'http://localhost:5000/api/tasks?limit=20&sortBy=dueDate&sortOrder=asc' -WebSession $session
Invoke-RestMethod -Uri 'http://localhost:5000/api/reports/workload' -WebSession $session
```

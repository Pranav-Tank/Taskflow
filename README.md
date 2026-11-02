<div align="center">

# Taskflow

### Clarity for projects. Accountability for teams.

A full-stack workspace for projects, people and priorities—with resource-level permissions, auditable task changes and scoped analytics.

![React](docs/assets/badge-react.svg)
![Express](docs/assets/badge-express.svg)
![Prisma](docs/assets/badge-prisma.svg)
![PostgreSQL](docs/assets/badge-postgresql.svg)
![Vite](docs/assets/badge-vite.svg)

[Screenshots](#a-look-inside) · [Features](#what-you-can-do) · [Architecture](#how-it-is-built) · [Run locally](#run-locally) · [Documentation](#documentation)

</div>

![Taskflow dashboard showing project metrics, task status and team workload](docs/screenshots/dashboard.png)

<p align="center"><em>Actual running application with the seeded PostgreSQL dataset. <a href="docs/screenshots/dashboard-full.png">Explore the full dashboard →</a></em></p>

## The project

Taskflow brings project ownership, team membership, task execution and progress reporting into one workspace. The interface adapts to four roles; the backend independently checks what each user can access and change.

The project demonstrates a complete React-to-PostgreSQL workflow: validated API requests, layered backend modules, Prisma repositories, transactional activity history, and SQL reporting that respects the same access boundaries as task lists.

| Users | Projects | Memberships |  Tasks | Comments | Activity records |
| ----: | -------: | ----------: | -----: | -------: | ---------------: |
| 1,000 |      500 |       3,000 | 20,000 |   10,000 |           20,000 |

These are reproducible **seed counts**, not concurrent-user or load-test results.

## A look inside

<table>
  <tr>
    <td width="50%" valign="top"><strong>Project workspace</strong><br><sub>Project cards, progress and ownership.</sub><br><br><a href="docs/screenshots/projects.png"><img src="docs/screenshots/projects.png" alt="Taskflow project cards with statuses, progress and managers"></a></td>
    <td width="50%" valign="top"><strong>Task discovery</strong><br><sub>Search, filters, status, priority and sorting.</sub><br><br><a href="docs/screenshots/tasks.png"><img src="docs/screenshots/tasks.png" alt="Taskflow searchable task table with status badges and due dates"></a></td>
  </tr>
  <tr>
    <td width="50%" valign="top"><strong>Project teams</strong><br><sub>Membership and project-specific reporting lines.</sub><br><br><a href="docs/screenshots/project-detail.png"><img src="docs/screenshots/project-detail.png" alt="Project details and team membership administration"></a></td>
    <td width="50%" valign="top"><strong>Task context</strong><br><sub>Blocked reasons, discussion and activity history.</sub><br><br><a href="docs/screenshots/task-detail.png"><img src="docs/screenshots/task-detail.png" alt="Task details with blocked reason, seeded comment and activity history"></a></td>
  </tr>
</table>

<details>
<summary><strong>More screens: people management, sign-in and mobile</strong></summary>

### People management

![Admin user management with roles and account controls](docs/screenshots/people.png)

### Sign-in

![Taskflow sign-in screen](docs/screenshots/login.png)

### Mobile overview

<img src="docs/screenshots/mobile.png" width="320" alt="Taskflow dashboard at a 390-pixel mobile viewport">

</details>

Screens were captured from the local app on **3 November 2026** using demo accounts. Counts and overdue totals may change when the database or date changes. [Capture notes](docs/SCREENSHOTS.md)

## What you can do

| Area          | Capabilities                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects      | Create and manage projects, assign ownership, organize teams, inspect task progress and archive projects through soft deletion.                                |
| Tasks         | Create, assign and update tasks with priority, due date, blocked reason and completion tracking.                                                               |
| Discovery     | Combine text search across tasks/projects/assignees with project, assignee, status, priority, date-range and overdue filters. Sort and paginate on the server. |
| Collaboration | Add task comments and inspect a paginated activity trail for task changes.                                                                                     |
| People        | Administer users, roles and activation; manage project membership and team-lead reporting lines.                                                               |
| Reporting     | View scoped totals, status/priority distributions, team distribution, top-five employee workload and project completion reports.                               |
| Interface     | Responsive layouts, controlled forms, loading/empty/error states and role-aware navigation.                                                                    |

### Four roles, explicit boundaries

| Role      | Record scope                                                        | Typical actions                                                    |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Admin     | All projects and tasks                                              | Manage users, projects, membership and tasks.                      |
| Manager   | Projects assigned to them                                           | Manage their projects, teams and tasks; reopen completed tasks.    |
| Team Lead | Member projects; tasks assigned to themselves or their project team | Create and manage tasks within their team.                         |
| Employee  | Member project metadata; their assigned tasks                       | Update task status/blocked reason and comment on accessible tasks. |

Role checks are enforced on the API, including direct record-ID requests. Hiding a button is only a UI convenience.

## How it is built

```mermaid
flowchart LR
  UI[React + Vite] --> API[Express API]
  API --> V[Validation + authentication]
  V --> C[Controller]
  C --> S[Service / business rules]
  S --> R[Repository]
  R --> P[Prisma Client]
  P --> DB[(PostgreSQL)]
  R --> A[Analytics SQL only]
  A --> DB
  R --> M[Mapper / public DTO]
  M --> O[Shared response]
```

| Layer        | Technologies / responsibility                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Frontend     | React, Vite, Context for authentication and a fetch hook with cancellation/cleanup.                                      |
| HTTP API     | Express 5, Joi validation, JWT authentication, HttpOnly cookies, Helmet and rate limiting.                               |
| Persistence  | Prisma ORM 7.10 with the PostgreSQL driver adapter; one initial migration and a repeatable seed.                         |
| Consistency  | Serializable transactions with bounded conflict retries; task mutations and activity writes share a transaction client.  |
| Reporting    | Parameterized PostgreSQL aggregates within the analytics repository.                                                     |
| Verification | Node's test runner, HTTP integration tests, an isolated PostgreSQL-compatible test engine, and native PostgreSQL checks. |

### Engineering decisions

- **Clear module boundaries.** Routes → validation → controllers → services → repositories → mappers. Shared responses, pagination, dates and scope filters live in common modules.
- **Permissions before results.** Record scopes apply before pagination or aggregation, keeping task lists and dashboards consistent for each role.
- **Database guarantees.** Composite foreign keys enforce project membership; CHECK constraints protect blocked reasons and completion timestamps.
- **Atomic history.** Task changes, reassignment events, status transitions and comments are recorded within their transaction.
- **Prisma for application queries.** CRUD, search, membership and project summaries use model queries; raw application SQL is confined to analytics.
- **Bounded query work.** Lists use server-side pagination. Project-page task counts use grouped queries instead of a separate count request per project.

<details>
<summary><strong>Repository layout</strong></summary>

```text
backend/
  prisma/                  Models + initial migration
  scripts/seed.js          Repeatable Prisma seed
  src/
    common/               Responses, pagination, dates, scopes
    middleware/           Authentication + role gates
    lib/                  Validation, errors, password hashing
    modules/
      auth/               Sign-in + session handling
      users/              User administration + directory
      projects/           Projects + membership
      tasks/              Tasks + comments + activity
      analytics/          Dashboard + reporting SQL
      health/             Database readiness
    app.js                Middleware + route composition
    server.js             Startup + shutdown + production hosting
  tests/                  Architecture + HTTP/database checks
frontend/src/
  pages/                  Overview, projects, tasks, people
  api.js                  Shared HTTP and response handling
  hooks.js                Resource loading + hash navigation
  auth.jsx                Auth context + sign-in
  components.jsx          Reusable UI components
docs/                     Architecture, API, database, resume + screenshots
```

</details>

## Run locally

**Prerequisites:** Node.js **24.11+**, npm and a running PostgreSQL server. Clone this repository and open a terminal at its root. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm`.

### 1. Install and configure

```bash
npm install
```

Copy `backend/.env.example` to `backend/.env`. For example, in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

For a fresh PostgreSQL setup, run these statements separately in psql or pgAdmin using an administrative account:

```sql
CREATE ROLE taskflow LOGIN PASSWORD 'CHOOSE_YOUR_PASSWORD';
CREATE DATABASE taskflow OWNER taskflow;
```

Set the backend environment values:

```dotenv
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://taskflow:YOUR_URL_ENCODED_PASSWORD@localhost:5432/taskflow
JWT_SECRET=YOUR_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
NODE_ENV=development
```

Generate a JWT secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Keep `.env` out of source control.

### 2. Create the schema and seed

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3. Start both applications

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Frontend: **http://localhost:5173** · API health: **http://localhost:5000/api/health**

### Demo accounts

All seeded demo accounts use **Taskflow123!**.

| Admin                | Manager                | Team Lead           | Employee                |
| -------------------- | ---------------------- | ------------------- | ----------------------- |
| admin@taskflow.local | manager@taskflow.local | lead@taskflow.local | employee@taskflow.local |

## Verification

```bash
npm test
npm run build
npm run db:validate
npm run db:status
```

Latest local verification: **9 reported tests passed**, frontend production build passed, Prisma schema validated, and the fresh native PostgreSQL migration and seed completed. Native checks also verified four-role task/dashboard consistency and concurrent Admin deactivation protection.

Tests cover record-ID tampering, role restrictions, task transitions, membership rules, comments/history, combined filters, pagination, response envelopes, scoped project counts, conflicts and rollback. An architecture check guards the repository and analytics-only SQL boundaries.

### Scope and next steps

The project has not been published as a hosted demo. Seed size is not a production performance benchmark. Current trade-offs include offset pagination, process-local rate limiting, no individual JWT revocation, and no optimistic version check for stale forms. These are practical next steps rather than completed features.

## Documentation

| Guide                                            | Use it for                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| [Architecture walkthrough](docs/ARCHITECTURE.md) | Layer responsibilities, request flow and engineering decisions.       |
| [API reference](docs/API.md)                     | Routes, permissions, inputs and response conventions.                 |
| [Database workflow](docs/PRISMA.md)              | Models, migrations and seed commands.                                 |
| [Deployment notes](docs/DEPLOYMENT.md)           | Build, environment configuration and same-origin hosting.             |
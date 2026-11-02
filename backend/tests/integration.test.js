import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import pg from "pg";

test("Taskflow: full seed, permissions, business rules, queries and HTTP contracts", async (t) => {
  const db = new PGlite();
  await db.waitReady;
  const socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 55441 });
  await socket.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:55441/postgres";
  process.env.JWT_SECRET = randomBytes(48).toString("hex");
  process.env.NODE_ENV = "test";
  process.env.DB_POOL_MAX = "1";
  const { prisma } = await import("../src/db.js");
  const { initialize } = await import("./setup.js");
  const { seed, seedId } = await import("../scripts/seed.js");
  let server;
  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    await socket.stop();
    await db.close();
  });
  const fixturePool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  try {
    await initialize(fixturePool);
  } finally {
    await fixturePool.end();
  }
  await seed();
  await seed();
  const { app } = await import("../src/app.js");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port + "/api";
  const cookies = {};
  async function call(role, path, method = "GET", body, headers = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookies[role] ? { Cookie: cookies[role] } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = response.status === 204 ? null : await response.json();
    return { response, body: result, status: response.status };
  }
  async function login(role) {
    const result = await call("", "/auth/login", "POST", {
      email: role + "@taskflow.local",
      password: "Taskflow123!",
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    cookies[role] = result.response.headers.getSetCookie()[0].split(";")[0];
    return result.body.data;
  }
  const project0 = seedId("project", 0),
    project1 = seedId("project", 1),
    ownTask = seedId("task", 0),
    otherTask = seedId("task", 2);
  await t.test("repeatable full-size seed and database integrity", async () => {
    for (const [table, count] of [
      ["users", 1000],
      ["projects", 500],
      ["tasks", 20000],
      ["comments", 10000],
      ["activity_logs", 20000],
    ])
      assert.equal(
        await prisma[
          {
            users: "user",
            projects: "project",
            tasks: "task",
            comments: "comment",
            activity_logs: "activityLog",
          }[table]
        ].count(),
        count,
      );
    assert.equal((await call("", "/tasks")).status, 401);
    assert.equal(
      (
        await call("", "/auth/login", "POST", {
          email: "admin@taskflow.local",
          password: "wrong",
        })
      ).status,
      401,
    );
    for (const role of ["admin", "manager", "lead", "employee"]) {
      const user = await login(role);
      assert.ok(!Object.hasOwn(user, "password_hash"));
    }
  });
  await t.test(
    "roles and resource scopes cannot be bypassed with IDs",
    async () => {
      assert.equal((await call("admin", "/tasks")).body.meta.total, 20000);
      assert.equal((await call("admin", "/users")).body.meta.total, 1000);
      assert.equal(
        (await call("manager", "/projects/" + project1)).status,
        404,
      );
      assert.equal(
        (
          await call("manager", "/tasks/" + seedId("task", 40), "PATCH", {
            status: "COMPLETED",
          })
        ).status,
        404,
      );
      assert.equal((await call("employee", "/tasks/" + otherTask)).status, 404);
      assert.equal(
        (
          await call("employee", "/tasks/" + otherTask, "PATCH", {
            status: "COMPLETED",
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call("employee", "/tasks/" + ownTask, "PATCH", {
            priority: "CRITICAL",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("employee", "/tasks/" + ownTask, "PATCH", {
            assigneeId: seedId("user", 4),
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("employee", "/tasks", "POST", {
            projectId: project0,
            title: "Not permitted",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("lead", "/projects/" + project0, "PATCH", {
            name: "Not permitted",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("lead", "/users", "POST", {
            name: "Unauthorized",
            email: "x@example.com",
            password: "Password123!",
          })
        ).status,
        403,
      );
      assert.equal(
        (await call("manager", "/projects/" + project0, "DELETE")).status,
        403,
      );
      assert.equal((await call("employee", "/users")).status, 403);
      assert.equal(
        (
          await call("lead", "/tasks/" + otherTask, "PATCH", {
            status: "COMPLETED",
          })
        ).status,
        404,
      );
      assert.equal((await call("admin", "/tasks?role=ADMIN")).status, 400);
      assert.equal(
        (
          await call(
            "admin",
            "/tasks",
            "POST",
            { projectId: project0, title: "Bad origin" },
            { Origin: "https://untrusted.example" },
          )
        ).status,
        403,
      );
    },
  );
  let created;
  await t.test(
    "membership, completion, blocked reason, audit and reopening rules",
    async () => {
      let result = await call("manager", "/tasks", "POST", {
        projectId: project0,
        title: "Integration business rules",
        assigneeId: seedId("user", 9),
      });
      assert.equal(result.status, 400);
      result = await call("lead", "/tasks", "POST", {
        projectId: project0,
        title: "Wrong team assignment",
        assigneeId: seedId("user", 7),
      });
      assert.equal(result.status, 403);
      result = await call("manager", "/tasks", "POST", {
        projectId: project0,
        title: "Integration business rules",
        assigneeId: seedId("user", 3),
      });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      created = result.body.data.id;
      assert.equal(
        (
          await call("employee", "/tasks/" + created, "PATCH", {
            status: "BLOCKED",
          })
        ).status,
        400,
      );
      result = await call("employee", "/tasks/" + created, "PATCH", {
        status: "BLOCKED",
        blockedReason: "Waiting for review",
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.data.blocked_reason, "Waiting for review");
      result = await call("employee", "/tasks/" + created, "PATCH", {
        status: "COMPLETED",
      });
      assert.equal(result.status, 200);
      assert.ok(result.body.data.completed_at);
      assert.equal(
        (
          await call("employee", "/tasks/" + created, "PATCH", {
            status: "TODO",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("lead", "/tasks/" + created, "PATCH", {
            status: "IN_PROGRESS",
          })
        ).status,
        403,
      );
      result = await call("manager", "/tasks/" + created, "PATCH", {
        status: "IN_PROGRESS",
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.data.completed_at, null);
      result = await call("manager", "/tasks/" + created, "PATCH", {
        assigneeId: seedId("user", 7),
      });
      assert.equal(result.status, 200);
      assert.equal((await call("employee", "/tasks/" + created)).status, 404);
      const history = await call("manager", "/tasks/" + created + "/activity");
      assert.ok(
        history.body.data.some((item) => item.action === "ASSIGNEE_CHANGED"),
      );
      assert.equal(
        (
          await call(
            "manager",
            "/projects/" + project0 + "/members",
            "DELETE",
            { userId: seedId("user", 7) },
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call("lead", "/projects/" + project0 + "/members", "PUT", {
            userId: seedId("user", 9),
          })
        ).status,
        403,
      );
    },
  );
  await t.test(
    "query challenges combine filters, scoped SQL aggregates and pagination",
    async () => {
      const result = await call(
        "admin",
        "/tasks?search=payment&projectId=" +
          project0 +
          "&status=IN_PROGRESS&priority=MEDIUM&limit=5&sortBy=dueDate&sortOrder=asc",
      );
      assert.equal(result.status, 200);
      assert.ok(result.body.data.length > 0 && result.body.data.length <= 5);
      for (const task of result.body.data) {
        assert.equal(task.project_id, project0);
        assert.equal(task.status, "IN_PROGRESS");
        assert.equal(task.priority, "MEDIUM");
      }
      const byProject = await call(
        "admin",
        "/tasks?search=" + encodeURIComponent("Website relaunch 001"),
      );
      assert.ok(byProject.body.meta.total > 0);
      const byAssignee = await call(
        "admin",
        "/tasks?search=" + encodeURIComponent("Riya Desai 004"),
      );
      assert.ok(byAssignee.body.meta.total > 0);
      const one = await call("admin", "/tasks?limit=7&page=1"),
        two = await call("admin", "/tasks?limit=7&page=2");
      assert.equal(one.body.data.length, 7);
      assert.ok(
        two.body.data.every(
          (row) => !one.body.data.some((first) => first.id === row.id),
        ),
      );
      assert.equal(
        (await call("admin", "/tasks?sortBy=title;DROP%20TABLE%20users"))
          .status,
        400,
      );
      assert.equal((await call("admin", "/tasks?limit=100000")).status, 400);
      assert.equal(
        (await call("admin", "/tasks?dueFrom=2026-02-31")).status,
        400,
      );
      assert.equal(
        (await call("admin", "/tasks?dueFrom=2026-12-01&dueTo=2026-01-01"))
          .status,
        400,
      );
      const employee = await call("employee", "/tasks?limit=100");
      assert.ok(
        employee.body.data.every(
          (row) => row.assignee_id === seedId("user", 3),
        ),
      );
      const summary = (await call("employee", "/dashboard")).body.data;
      assert.equal(summary.total_tasks, employee.body.meta.total);
      const workload = (await call("manager", "/reports/workload")).body.data;
      assert.ok(workload.length <= 5);
      for (let i = 1; i < workload.length; i++)
        assert.ok(
          workload[i - 1].incomplete_tasks >= workload[i].incomplete_tasks,
        );
      const performance = await call("manager", "/reports/project-performance");
      assert.equal(performance.status, 200);
      assert.ok(!performance.body.data.some((row) => row.id === project1));
      const leadTasks = await call(
        "lead",
        "/tasks?projectId=" + project0 + "&limit=100",
      );
      assert.ok(
        leadTasks.body.data.every((row) =>
          [seedId("user", 3), seedId("user", 4), seedId("user", 2)].includes(
            row.assignee_id,
          ),
        ),
      );
    },
  );
  await t.test(
    "comments and user/project administration obey scopes and active accounts",
    async () => {
      const result = await call(
        "manager",
        "/tasks/" + created + "/comments",
        "POST",
        { body: "Reviewed by manager" },
      );
      assert.equal(result.status, 201);
      assert.equal(
        (
          await call("employee", "/tasks/" + created + "/comments", "POST", {
            body: "Not mine",
          })
        ).status,
        404,
      );
      assert.ok(
        (await call("manager", "/tasks/" + created + "/comments")).body.data
          .length > 0,
      );
      let person = await call("admin", "/users", "POST", {
        name: "Integration Person",
        email: "integration@example.com",
        password: "Taskflow123!",
        role: "EMPLOYEE",
      });
      assert.equal(person.status, 201);
      const userId = person.body.data.id;
      assert.equal(
        (
          await call("manager", "/projects/" + project0 + "/members", "PUT", {
            userId,
            teamLeadId: seedId("user", 2),
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            "manager",
            "/projects/" + project0 + "/members",
            "DELETE",
            { userId },
          )
        ).status,
        204,
      );
      assert.equal(
        (await call("admin", "/users/" + userId, "PATCH", { active: false }))
          .status,
        200,
      );
      assert.equal(
        (
          await call("", "/auth/login", "POST", {
            email: "integration@example.com",
            password: "Taskflow123!",
          })
        ).status,
        401,
      );
      const project = await call("manager", "/projects", "POST", {
        name: "New managed project",
        managerId: seedId("user", 6),
      });
      assert.equal(project.status, 201);
      assert.equal(project.body.data.manager_id, seedId("user", 1));
      assert.equal(
        (
          await call("manager", "/projects/" + project.body.data.id, "PATCH", {
            managerId: seedId("user", 6),
          })
        ).status,
        403,
      );
      assert.equal(
        (await call("admin", "/projects/" + project.body.data.id, "DELETE"))
          .status,
        204,
      );
      assert.equal(
        (await call("admin", "/projects/" + project.body.data.id)).status,
        404,
      );
      assert.equal((await call("admin", "/tasks/" + randomUUID())).status, 404);
      assert.equal(
        (await call("manager", "/tasks/" + created, "DELETE")).status,
        204,
      );
      assert.equal((await call("admin", "/tasks/" + created)).status, 404);
      assert.equal((await call("admin", "/auth/logout", "POST")).status, 204);
      await login("admin");
    },
  );
  await t.test(
    "Prisma preserves API dates, literal search, conflicts and rollback",
    async () => {
      const duplicate = await call("admin", "/users", "POST", {
        name: "Duplicate",
        email: "manager@taskflow.local",
        password: "Taskflow123!",
        role: "EMPLOYEE",
      });
      assert.equal(duplicate.status, 409);
      const createdDate = await call("manager", "/tasks", "POST", {
        projectId: project0,
        title: "Prisma literal 100%_marker",
        assigneeId: seedId("user", 3),
        dueDate: "2026-12-20",
      });
      assert.equal(createdDate.status, 201, JSON.stringify(createdDate.body));
      assert.equal(createdDate.body.data.due_date, "2026-12-20");
      const literal = await call(
        "manager",
        "/tasks?search=" + encodeURIComponent("%_marker"),
      );
      assert.equal(literal.body.meta.total, 1);
      assert.equal(literal.body.data[0].id, createdDate.body.data.id);
      const cleared = await call(
        "manager",
        "/tasks/" + createdDate.body.data.id,
        "PATCH",
        { dueDate: null, assigneeId: null },
      );
      assert.equal(cleared.status, 200);
      assert.equal(cleared.body.data.due_date, null);
      assert.equal(cleared.body.data.assignee_id, null);
      const statuses = await call("manager", "/projects?status=ACTIVE");
      assert.equal(statuses.status, 200);
      assert.ok(statuses.body.data.every((p) => p.status === "ACTIVE"));
      const before = await prisma.task.count();
      await assert.rejects(
        prisma.$transaction(async (client) => {
          await client.task.create({
            data: {
              project_id: project0,
              title: "Rollback marker",
              created_by: seedId("user", 0),
            },
          });
          throw new Error("Rollback on purpose");
        }),
        /Rollback on purpose/,
      );
      assert.equal(await prisma.task.count(), before);
    },
  );
  await t.test(
    "shared envelopes and grouped project counts match scoped task lists",
    async () => {
      const projects = await call("employee", "/projects?limit=5");
      assert.equal(projects.body.success, true);
      for (const project of projects.body.data) {
        assert.equal(typeof project.task_count, "number");
        const tasks = await call("employee", "/tasks?projectId=" + project.id);
        assert.equal(project.task_count, tasks.body.meta.total);
      }
      const rejected = await call("admin", "/tasks?limit=100000");
      assert.equal(rejected.body.success, false);
      assert.ok(Array.isArray(rejected.body.error.details));
    },
  );
});

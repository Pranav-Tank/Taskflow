import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { prisma } from "../src/db.js";
import { dateValue } from "../src/common/date.js";
import { hashPassword } from "../src/lib/password.js";
export function seedId(kind, index) {
  const bytes = createHash("sha256")
    .update("taskflow-v1:" + kind + ":" + index)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
async function bulk(client, table, columns, rows) {
  const models = {
    users: "user",
    projects: "project",
    project_members: "projectMember",
    tasks: "task",
    comments: "comment",
    activity_logs: "activityLog",
  };
  for (let i = 0; i < rows.length; i += 250) {
    const data = rows
      .slice(i, i + 250)
      .map((row) =>
        Object.fromEntries(
          columns.map((key, index) => [
            key,
            key === "due_date"
              ? dateValue(row[index])
              : key === "metadata"
                ? JSON.parse(row[index])
                : row[index],
          ]),
        ),
      );
    await client[models[table]].createMany({ data, skipDuplicates: true });
  }
}
export async function seed(db = prisma) {
  const password = await hashPassword("Taskflow123!"); // Shared demo password only; real user creation gets a fresh salt.
  const users = [];
  const managers = [];
  const leads = [];
  const employees = [];
  const names = [
    "Aarav Shah",
    "Mira Patel",
    "Dev Mehta",
    "Riya Desai",
    "Kabir Rao",
    "Ananya Joshi",
    "Nikhil Shah",
    "Isha Shah",
  ];
  for (let i = 0; i < 1000; i++) {
    const role =
      i === 0
        ? "ADMIN"
        : i === 1 || i === 6
          ? "MANAGER"
          : i === 2 || i === 5
            ? "TEAM_LEAD"
            : i < 10
              ? "EMPLOYEE"
              : i % 10 === 0
                ? "MANAGER"
                : i % 10 <= 2
                  ? "TEAM_LEAD"
                  : "EMPLOYEE";
    const email =
      i === 0
        ? "admin@taskflow.local"
        : i === 1
          ? "manager@taskflow.local"
          : i === 2
            ? "lead@taskflow.local"
            : i === 3
              ? "employee@taskflow.local"
              : "user" + i + "@taskflow.local";
    users.push([
      seedId("user", i),
      names[i % names.length] + " " + String(i + 1).padStart(3, "0"),
      email,
      password,
      role,
    ]);
    if (role === "MANAGER") managers.push(i);
    if (role === "TEAM_LEAD") leads.push(i);
    if (role === "EMPLOYEE") employees.push(i);
  }
  const projects = [];
  const leadMembers = [];
  const employeeMembers = [];
  const assignments = [];
  const labels = [
    "Website relaunch",
    "Mobile experience",
    "Customer portal",
    "Payments platform",
    "Operations hub",
    "Analytics studio",
    "API modernization",
    "Design system",
  ];
  for (let p = 0; p < 500; p++) {
    const projectId = seedId("project", p);
    const leadA = leads[(p * 2) % leads.length],
      leadB = leads[(p * 2 + 1) % leads.length];
    const team = [0, 1, 2, 3].map(
      (n) => employees[(p * 4 + n) % employees.length],
    );
    assignments.push(team);
    projects.push([
      projectId,
      labels[p % labels.length] + " " + String(p + 1).padStart(3, "0"),
      "A cross-functional delivery project with product, engineering and quality milestones.",
      ["ACTIVE", "PLANNING", "ON_HOLD", "COMPLETED"][p % 4],
      seedId("user", managers[p % managers.length]),
    ]);
    leadMembers.push(
      [projectId, seedId("user", leadA), null],
      [projectId, seedId("user", leadB), null],
    );
    team.forEach((u, n) =>
      employeeMembers.push([
        projectId,
        seedId("user", u),
        seedId("user", n < 2 ? leadA : leadB),
      ]),
    );
  }
  const tasks = [],
    comments = [],
    logs = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const titles = [
    "Design dashboard",
    "Build payment workflow",
    "Review permissions",
    "Write API tests",
    "Improve onboarding",
    "Audit accessibility",
    "Document endpoints",
    "Verify release",
  ];
  for (let i = 0; i < 20000; i++) {
    const p = Math.floor(i / 40),
      user = assignments[p][i % 4],
      status = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "BLOCKED"][
        i % 5
      ];
    const due = new Date(today.valueOf() + ((i % 31) - 15) * 86400000)
      .toISOString()
      .slice(0, 10);
    const created = new Date(
      today.valueOf() - 30 * 86400000 + (i % 1000) * 60000,
    );
    tasks.push([
      seedId("task", i),
      seedId("project", p),
      titles[i % titles.length] + " #" + (i + 1),
      "Coordinate with the project team. Review acceptance criteria, implementation and payment integration where applicable.",
      status,
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"][i % 4],
      seedId("user", user),
      due,
      status === "BLOCKED" ? "Waiting for dependency review" : null,
      status === "COMPLETED" ? new Date(created.valueOf() + 86400000) : null,
      seedId("user", managers[p % managers.length]),
      created,
    ]);
    logs.push([
      seedId("activity", i),
      seedId("task", i),
      seedId("user", user),
      "TASK_CREATED",
      JSON.stringify({ source: "repeatable-seed" }),
      created,
    ]);
  }
  for (let i = 0; i < 10000; i++) {
    const taskIndex = i * 2;
    const p = Math.floor(taskIndex / 40);
    comments.push([
      seedId("comment", i),
      seedId("task", taskIndex),
      seedId("user", assignments[p][taskIndex % 4]),
      "Reviewed the acceptance criteria. Please keep the project team updated on progress.",
    ]);
  }
  await db.$transaction(
    async (client) => {
      await bulk(
        client,
        "users",
        ["id", "name", "email", "password_hash", "role"],
        users,
      );
      await bulk(
        client,
        "projects",
        ["id", "name", "description", "status", "manager_id"],
        projects,
      );
      await bulk(
        client,
        "project_members",
        ["project_id", "user_id", "team_lead_id"],
        leadMembers,
        "project_id,user_id",
      );
      await bulk(
        client,
        "project_members",
        ["project_id", "user_id", "team_lead_id"],
        employeeMembers,
        "project_id,user_id",
      );
      await bulk(
        client,
        "tasks",
        [
          "id",
          "project_id",
          "title",
          "description",
          "status",
          "priority",
          "assignee_id",
          "due_date",
          "blocked_reason",
          "completed_at",
          "created_by",
          "created_at",
        ],
        tasks,
      );
      await bulk(
        client,
        "comments",
        ["id", "task_id", "author_id", "body"],
        comments,
      );
      await bulk(
        client,
        "activity_logs",
        ["id", "task_id", "actor_id", "action", "metadata", "created_at"],
        logs,
      );
      console.log(
        "Seed ready: 1,000 users / 500 projects / 20,000 tasks / 10,000 comments / 20,000 activity logs.",
      );
    },
    { maxWait: 10000, timeout: 180000 },
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  seed()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

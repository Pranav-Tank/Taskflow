import { prisma, transaction } from "../../db.js";
import { AppError, requireValue } from "../../lib/errors.js";
import * as repository from "./task.repository.js";
import * as projects from "../projects/project.repository.js";
async function validateAssignee(client, user, projectId, assigneeId) {
  if (!assigneeId) {
    if (user.role === "TEAM_LEAD")
      throw new AppError(
        "Team leads must assign a task to themselves or a member of their team",
        403,
      );
    return;
  }
  const member = requireValue(
    await repository.assignee(client, projectId, assigneeId),
    "Assignee must be a member of this project",
    400,
  );
  if (!member.active || !["TEAM_LEAD", "EMPLOYEE"].includes(member.role))
    throw new AppError(
      "Assign an active employee or team lead who belongs to this project",
    );
  if (
    user.role === "TEAM_LEAD" &&
    member.id !== user.id &&
    member.team_lead_id !== user.id
  )
    throw new AppError("You may assign tasks only within your own team", 403);
}
export const list = repository.list;
export async function get(user, id) {
  return requireValue(await repository.get(user, id), "Task not found");
}
export async function create(user, data) {
  if (user.role === "EMPLOYEE")
    throw new AppError("Employees cannot create tasks", 403);
  return transaction(async (client) => {
    requireValue(
      await projects.get(user, data.projectId, client),
      "Project not found",
    );
    await validateAssignee(client, user, data.projectId, data.assigneeId);
    if (data.status === "BLOCKED" && !data.blockedReason?.trim())
      throw new AppError("A blocked task needs a reason");
    const task = await repository.createTask(client, data, user);
    await repository.activity(client, task.id, user.id, "TASK_CREATED", {
      title: data.title,
      assigneeId: data.assigneeId,
    });
    return repository.get(user, task.id, client);
  });
}
export async function update(user, id, data) {
  if (
    user.role === "EMPLOYEE" &&
    Object.keys(data).some((key) => !["status", "blockedReason"].includes(key))
  )
    throw new AppError(
      "Employees can change only their own task status and blocked reason",
      403,
    );
  return transaction(async (client) => {
    const old = requireValue(
      await repository.get(user, id, client),
      "Task not found",
    );
    const status = data.status ?? old.status;
    if (
      old.status === "COMPLETED" &&
      status !== "COMPLETED" &&
      !["ADMIN", "MANAGER"].includes(user.role)
    )
      throw new AppError(
        "Only an Admin or the project Manager may reopen completed tasks",
        403,
      );
    const reason =
      status === "BLOCKED"
        ? (data.blockedReason ??
          (old.status === "BLOCKED" ? old.blocked_reason : null))
        : null;
    if (status === "BLOCKED" && !reason?.trim())
      throw new AppError("A blocked task needs a reason");
    const assignee = Object.hasOwn(data, "assigneeId")
      ? data.assigneeId
      : old.assignee_id;
    if (Object.hasOwn(data, "assigneeId"))
      await validateAssignee(client, user, old.project_id, assignee);
    await repository.updateTask(
      client,
      id,
      data,
      old,
      status,
      assignee,
      reason,
    );
    if (assignee !== old.assignee_id)
      await repository.activity(client, id, user.id, "ASSIGNEE_CHANGED", {
        from: old.assignee_id,
        to: assignee,
      });
    if (status !== old.status)
      await repository.activity(client, id, user.id, "STATUS_CHANGED", {
        from: old.status,
        to: status,
        reason,
      });
    await repository.activity(client, id, user.id, "TASK_UPDATED", {
      fields: Object.keys(data),
    });
    return repository.get(user, id, client);
  });
}
export async function remove(user, id) {
  if (!["ADMIN", "MANAGER"].includes(user.role))
    throw new AppError(
      "Only Admins and project Managers may delete tasks",
      403,
    );
  await transaction(async (client) => {
    requireValue(await repository.get(user, id, client), "Task not found");
    await repository.softDeleteTask(client, id);
    await repository.activity(client, id, user.id, "TASK_DELETED");
  });
}
export async function history(user, id, kind, options) {
  await get(user, id);
  return repository.history(prisma, id, kind, options.page, options.limit);
}
export async function comment(user, id, body) {
  return transaction(async (client) => {
    requireValue(await repository.get(user, id, client), "Task not found");
    const comment = await repository.createComment(client, id, user, body);
    await repository.activity(client, id, user.id, "COMMENT_ADDED");
    return {
      ...comment,
      author_name: user.name,
    };
  });
}

import { transaction } from "../../db.js";
import { AppError, requireValue } from "../../lib/errors.js";
import * as repository from "./project.repository.js";
export const list = repository.list;
export async function get(user, id) {
  const project = requireValue(
    await repository.get(user, id),
    "Project not found",
  );
  const summary = await repository.summary(user, id);
  return {
    ...project,
    summary,
    members: await repository.members(user, id),
  };
}
async function manager(client, id) {
  requireValue(
    await repository.activeManager(client, id),
    "Choose an active Manager",
    400,
  );
}
export async function create(user, data) {
  return transaction(async (client) => {
    const managerId = user.role === "MANAGER" ? user.id : data.managerId;
    if (!managerId) throw new AppError("A project Manager is required");
    await manager(client, managerId);
    return repository.createProject(client, data, managerId);
  });
}
export async function update(user, id, data) {
  return transaction(async (client) => {
    const old = requireValue(
      await repository.get(user, id, client),
      "Project not found",
    );
    if (
      user.role !== "ADMIN" &&
      data.managerId &&
      data.managerId !== old.manager_id
    )
      throw new AppError("Only an Admin can change the project Manager", 403);
    if (data.managerId) await manager(client, data.managerId);
    return repository.updateProject(client, id, data, old);
  });
}
export async function remove(user, id) {
  requireValue(await repository.get(user, id), "Project not found");
  await repository.softDeleteProject(id);
}
export async function addMember(user, id, data) {
  return transaction(async (client) => {
    requireValue(await repository.get(user, id, client), "Project not found");
    const member = requireValue(
      await repository.memberUser(client, data.userId),
      "User not found",
      400,
    );
    if (!member.active || !["TEAM_LEAD", "EMPLOYEE"].includes(member.role))
      throw new AppError("Add an active Team Lead or Employee");
    if (data.teamLeadId) {
      if (member.role !== "EMPLOYEE")
        throw new AppError("Only employees can report to a team lead");
      const lead = await repository.findEligibleLead(client, id, data);
      requireValue(
        lead,
        "The team lead must already belong to this project",
        400,
      );
    }
    const key = {
      project_id: id,
      user_id: data.userId,
    };
    const existing = await repository.findMembership(client, key);
    if (existing && existing.team_lead_id !== data.teamLeadId) {
      const assigned = await repository.findActiveAssignment(client, id, data);
      if (assigned)
        throw new AppError(
          "Reassign this member’s tasks before changing their team",
          409,
        );
    }
    await repository.saveMembership(client, key, data);
    return repository.members(user, id, client);
  });
}
export async function removeMember(user, id, memberId) {
  await transaction(async (client) => {
    requireValue(await repository.get(user, id, client), "Project not found");
    if (await repository.findAnyAssignment(client, id, memberId))
      throw new AppError(
        "Reassign all tasks (including completed or archived tasks) before removing this member",
        409,
      );
    if (await repository.findReportingMember(client, id, memberId))
      throw new AppError(
        "Move this lead’s team members before removing the lead",
        409,
      );
    const result = await repository.removeMembership(client, id, memberId);
    requireValue(result.count, "Member not found");
  });
}

import { transaction } from "../../db.js";
import { hashPassword } from "../../lib/password.js";
import { AppError, requireValue } from "../../lib/errors.js";
import * as repository from "./user.repository.js";
export const list = repository.list;
export async function create(data) {
  const passwordHash = await hashPassword(data.password);
  return repository.createUser(data, passwordHash);
}
export async function update(actor, id, data) {
  if (
    actor.id === id &&
    ((data.role && data.role !== "ADMIN") || data.active === false)
  )
    throw new AppError("You cannot deactivate or demote your own account", 409);
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return transaction(async (client) => {
    const old = requireValue(
      await repository.findById(client, id),
      "User not found",
    );
    if (data.role && data.role !== old.role) {
      const membership = await repository.findResponsibilityMembership(
        client,
        id,
      );
      const managed = await repository.findManagedProject(client, id);
      if (membership || managed)
        throw new AppError(
          "Remove project memberships and reassign managed projects before changing this user’s role",
          409,
        );
    }
    if (
      old.role === "ADMIN" &&
      ((data.role && data.role !== "ADMIN") || data.active === false)
    ) {
      const admins = await repository.activeAdminCount(client);
      if (admins <= 1)
        throw new AppError("Keep at least one active Admin", 409);
    }
    return repository.updateUser(client, id, data, old, passwordHash);
  });
}

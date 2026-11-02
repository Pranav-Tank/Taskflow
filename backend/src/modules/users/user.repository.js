import { prisma } from "../../db.js";
import { projectWhere } from "../../common/scopes.js";
const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
};
const literalSearch = (value) => value.replace(/[\\%_]/g, "\\$&");
export async function list(user, options, directory = false) {
  const conditions = [];
  if (directory)
    conditions.push({
      active: true,
    });
  if (options.search) {
    const term = {
      contains: literalSearch(options.search),
      mode: "insensitive",
    };
    conditions.push({
      OR: [
        {
          name: term,
        },
        {
          email: term,
        },
      ],
    });
  }
  if (options.role)
    conditions.push({
      role: options.role,
    });
  if (options.active !== undefined && !directory)
    conditions.push({
      active: options.active,
    });
  if (directory && user.role === "EMPLOYEE")
    conditions.push({
      id: user.id,
    });
  if (directory && user.role === "TEAM_LEAD")
    conditions.push({
      memberships: {
        some: {
          project: {
            is: projectWhere(user),
          },
          OR: [
            {
              team_lead_id: user.id,
            },
            {
              user_id: user.id,
            },
          ],
        },
      },
    });
  const where = {
    AND: conditions,
  };
  const total = await prisma.user.count({
    where,
  });
  const data = await prisma.user.findMany({
    where,
    select: {
      ...publicFields,
      created_at: true,
    },
    orderBy: [
      {
        name: "asc",
      },
      {
        id: "asc",
      },
    ],
    take: options.limit,
    skip: (options.page - 1) * options.limit,
  });
  return {
    data,
    meta: {
      total,
      page: options.page,
      limit: options.limit,
    },
  };
}
export function findById(client, id) {
  return client.user.findUnique({
    where: {
      id,
    },
  });
}
export function activeAdminCount(client) {
  return client.user.count({
    where: {
      role: "ADMIN",
      active: true,
    },
  });
}
export function findByEmail(email) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}
export function findActive(id) {
  return prisma.user.findFirst({
    where: {
      id,
      active: true,
    },
  });
}
export async function createUser(data, passwordHash) {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      password_hash: passwordHash,
      active: data.active ?? true,
    },
    select: publicFields,
  });
}
export async function findResponsibilityMembership(client, id) {
  return client.projectMember.findFirst({
    where: {
      user_id: id,
    },
  });
}
export async function findManagedProject(client, id) {
  return client.project.findFirst({
    where: {
      manager_id: id,
      deleted_at: null,
    },
  });
}
export async function updateUser(client, id, data, old, passwordHash) {
  return client.user.update({
    where: {
      id,
    },
    data: {
      name: data.name ?? old.name,
      email: data.email ?? old.email,
      role: data.role ?? old.role,
      active: data.active ?? old.active,
      ...(passwordHash
        ? {
            password_hash: passwordHash,
          }
        : {}),
      updated_at: new Date(),
    },
    select: publicFields,
  });
}

import { prisma } from "../../db.js";
import { projectWhere, taskWherePrisma } from "../../common/scopes.js";
import {
  pagination,
  pageResult,
  literalSearch,
  today,
} from "../../common/pagination.js";
import { projectView, memberView } from "./project.mapper.js";
export async function get(user, id, client = prisma) {
  return projectView(
    await client.project.findFirst({
      where: {
        id,
        ...projectWhere(user),
      },
      include: {
        manager: {
          select: {
            name: true,
          },
        },
      },
    }),
  );
}
export async function list(user, filters) {
  const where = {
    ...projectWhere(user),
    ...(filters.status
      ? {
          status: filters.status,
        }
      : {}),
    ...(filters.search
      ? {
          name: {
            contains: literalSearch(filters.search),
            mode: "insensitive",
          },
        }
      : {}),
  };
  const total = await prisma.project.count({
    where,
  });
  const rows = await prisma.project.findMany({
    where,
    include: {
      manager: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        created_at: "desc",
      },
      {
        id: "asc",
      },
    ],
    ...pagination(filters),
  });
  // Two grouped queries for the whole page, rather than one query per project.
  const taskWhere = {
    ...taskWherePrisma(user),
    project_id: {
      in: rows.map((row) => row.id),
    },
  };
  const totals = await prisma.task.groupBy({
    by: ["project_id"],
    where: taskWhere,
    _count: { _all: true },
  });
  const completed = await prisma.task.groupBy({
    by: ["project_id"],
    where: {
      ...taskWhere,
      status: "COMPLETED",
    },
    _count: { _all: true },
  });
  const counts = new Map(
    totals.map((row) => [row.project_id, row._count._all]),
  );
  const done = new Map(
    completed.map((row) => [row.project_id, row._count._all]),
  );
  return pageResult(
    rows.map((row) => ({
      ...projectView(row),
      task_count: counts.get(row.id) || 0,
      completed_tasks: done.get(row.id) || 0,
    })),
    total,
    filters,
  );
}
export async function summary(user, id) {
  const where = {
    ...taskWherePrisma(user),
    project_id: id,
  };
  const [total, completed, overdue] = await Promise.all([
    prisma.task.count({
      where,
    }),
    prisma.task.count({
      where: {
        ...where,
        status: "COMPLETED",
      },
    }),
    prisma.task.count({
      where: {
        ...where,
        status: {
          not: "COMPLETED",
        },
        due_date: {
          lt: today(),
        },
      },
    }),
  ]);
  return {
    total,
    completed,
    overdue,
  };
}
export async function members(user, id, client = prisma) {
  const where = {
    project_id: id,
  };
  if (user.role === "TEAM_LEAD")
    where.OR = [
      {
        user_id: user.id,
      },
      {
        team_lead_id: user.id,
      },
    ];
  if (user.role === "EMPLOYEE") where.user_id = user.id;
  const rows = await client.projectMember.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      },
      teamLead: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        user: {
          role: "asc",
        },
      },
      {
        user: {
          name: "asc",
        },
      },
    ],
  });
  return rows.map(memberView);
}
export function activeManager(client, id) {
  return client.user.findFirst({
    where: {
      id,
      role: "MANAGER",
      active: true,
    },
    select: {
      id: true,
    },
  });
}
export function memberUser(client, id) {
  return client.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      role: true,
      active: true,
    },
  });
}
export async function createProject(client, data, managerId) {
  return client.project.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      manager_id: managerId,
    },
  });
}
export async function updateProject(client, id, data, old) {
  return client.project.update({
    where: {
      id,
    },
    data: {
      name: data.name ?? old.name,
      description: data.description ?? old.description,
      status: data.status ?? old.status,
      manager_id: data.managerId ?? old.manager_id,
      updated_at: new Date(),
    },
  });
}
export async function softDeleteProject(id) {
  return prisma.project.update({
    where: {
      id,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
export async function findEligibleLead(client, id, data) {
  return client.projectMember.findFirst({
    where: {
      project_id: id,
      user_id: data.teamLeadId,
      user: {
        is: {
          role: "TEAM_LEAD",
          active: true,
        },
      },
    },
  });
}
export async function findMembership(client, key) {
  return client.projectMember.findUnique({
    where: {
      project_id_user_id: key,
    },
  });
}
export async function findActiveAssignment(client, id, data) {
  return client.task.findFirst({
    where: {
      project_id: id,
      assignee_id: data.userId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
}
export async function saveMembership(client, key, data) {
  return client.projectMember.upsert({
    where: {
      project_id_user_id: key,
    },
    create: {
      ...key,
      team_lead_id: data.teamLeadId,
    },
    update: {
      team_lead_id: data.teamLeadId,
    },
  });
}
export async function findAnyAssignment(client, id, memberId) {
  return client.task.findFirst({
    where: {
      project_id: id,
      assignee_id: memberId,
    },
    select: {
      id: true,
    },
  });
}
export async function findReportingMember(client, id, memberId) {
  return client.projectMember.findFirst({
    where: {
      project_id: id,
      team_lead_id: memberId,
    },
  });
}
export async function removeMembership(client, id, memberId) {
  return client.projectMember.deleteMany({
    where: {
      project_id: id,
      user_id: memberId,
    },
  });
}

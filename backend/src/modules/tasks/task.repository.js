import { prisma } from "../../db.js";
import { dateValue } from "../../common/date.js";
import { taskWherePrisma } from "../../common/scopes.js";
import {
  pagination,
  pageResult,
  literalSearch,
  today,
} from "../../common/pagination.js";
import { taskView, historyView } from "./task.mapper.js";
const include = {
  project: {
    select: {
      name: true,
    },
  },
  assigneeMember: {
    select: {
      user: {
        select: {
          name: true,
        },
      },
    },
  },
};
export function taskFilters(user, filters = {}) {
  const and = [taskWherePrisma(user)];
  for (const [input, column] of Object.entries({
    projectId: "project_id",
    assigneeId: "assignee_id",
    status: "status",
    priority: "priority",
  }))
    if (filters[input])
      and.push({
        [column]: filters[input],
      });
  if (filters.dueFrom || filters.dueTo)
    and.push({
      due_date: {
        ...(filters.dueFrom
          ? {
              gte: dateValue(filters.dueFrom),
            }
          : {}),
        ...(filters.dueTo
          ? {
              lte: dateValue(filters.dueTo),
            }
          : {}),
      },
    });
  if (filters.overdue)
    and.push({
      due_date: {
        lt: today(),
      },
      status: {
        not: "COMPLETED",
      },
    });
  if (filters.search) {
    const text = {
      contains: literalSearch(filters.search),
      mode: "insensitive",
    };
    and.push({
      OR: [
        {
          title: text,
        },
        {
          description: text,
        },
        {
          project: {
            is: {
              name: text,
            },
          },
        },
        {
          assigneeMember: {
            is: {
              user: {
                is: {
                  name: text,
                },
              },
            },
          },
        },
      ],
    });
  }
  return {
    AND: and,
  };
}
export async function list(user, filters) {
  const where = taskFilters(user, filters);
  const sorts = {
    dueDate: "due_date",
    createdAt: "created_at",
    updatedAt: "updated_at",
    title: "title",
    status: "status",
    priority: "priority",
  };
  const field = sorts[filters.sortBy] || "created_at";
  const direction = filters.sortOrder === "asc" ? "asc" : "desc";
  const order =
    field === "due_date"
      ? {
          due_date: {
            sort: direction,
            nulls: "last",
          },
        }
      : {
          [field]: direction,
        };
  const total = await prisma.task.count({
    where,
  });
  const rows = await prisma.task.findMany({
    where,
    include,
    orderBy: [
      order,
      {
        id: "asc",
      },
    ],
    ...pagination(filters),
  });
  return pageResult(rows.map(taskView), total, filters);
}
export async function get(user, id, client = prisma) {
  return taskView(
    await client.task.findFirst({
      where: {
        id,
        ...taskWherePrisma(user),
      },
      include,
    }),
  );
}
export function assignee(client, projectId, userId) {
  return client.projectMember
    .findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            active: true,
          },
        },
      },
    })
    .then((row) =>
      row
        ? {
            ...row.user,
            team_lead_id: row.team_lead_id,
          }
        : null,
    );
}
export function activity(client, taskId, actorId, action, metadata = {}) {
  return client.activityLog.create({
    data: {
      task_id: taskId,
      actor_id: actorId,
      action,
      metadata,
    },
  });
}
export async function history(client, taskId, kind, page, limit) {
  const relation = kind === "comments" ? "author" : "actor";
  const model = kind === "comments" ? client.comment : client.activityLog;
  const where = {
    task_id: taskId,
  };
  const total = await model.count({
    where,
  });
  const rows = await model.findMany({
    where,
    include: {
      [relation]: {
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
        id: "desc",
      },
    ],
    ...pagination({
      page,
      limit,
    }),
  });
  return pageResult(
    rows.map((row) => historyView(row, relation)),
    total,
    {
      page,
      limit,
    },
  );
}
export async function createTask(client, data, user) {
  return client.task.create({
    data: {
      project_id: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignee_id: data.assigneeId,
      due_date: dateValue(data.dueDate),
      blocked_reason: data.status === "BLOCKED" ? data.blockedReason : null,
      completed_at: data.status === "COMPLETED" ? new Date() : null,
      created_by: user.id,
    },
  });
}
export async function updateTask(
  client,
  id,
  data,
  old,
  status,
  assignee,
  reason,
) {
  return client.task.update({
    where: {
      id,
    },
    data: {
      title: data.title ?? old.title,
      description: data.description ?? old.description,
      status,
      priority: data.priority ?? old.priority,
      assignee_id: assignee,
      due_date: dateValue(
        Object.hasOwn(data, "dueDate") ? data.dueDate : old.due_date,
      ),
      blocked_reason: reason,
      completed_at:
        status === "COMPLETED" ? old.completed_at || new Date() : null,
      updated_at: new Date(),
    },
  });
}
export async function softDeleteTask(client, id) {
  return client.task.update({
    where: {
      id,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
export async function createComment(client, id, user, body) {
  return client.comment.create({
    data: {
      task_id: id,
      author_id: user.id,
      body,
    },
  });
}

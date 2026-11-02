import { prisma } from "../../db.js";
async function query(client, sql, values = []) {
  const rows = await client.$queryRawUnsafe(sql, ...values);
  return {
    rows,
  };
}
import { projectScope, taskScope } from "./analytics.scope.js";
import { taskWhere, joins } from "./analytics.filters.js";
export async function workload(user) {
  const { where, values } = taskWhere(user);
  const { rows } = await query(
    prisma,
    "SELECT u.id,u.name,count(*)::int AS incomplete_tasks,count(*) FILTER(WHERE t.due_date<CURRENT_DATE)::int AS overdue_tasks,count(*) FILTER(WHERE t.priority IN ('HIGH','CRITICAL'))::int AS high_priority_tasks" +
      joins +
      " WHERE " +
      where +
      " AND t.status<>'COMPLETED' AND u.active=true AND u.role='EMPLOYEE' GROUP BY u.id,u.name ORDER BY incomplete_tasks DESC,u.name,u.id LIMIT 5",
    values,
  );
  return rows;
}
export async function performance(user, { page = 1, limit = 10 } = {}) {
  const values = [];
  const project = projectScope(user, values);
  const tasks = taskScope(user, values);
  const countValues = [];
  const countScope = projectScope(user, countValues);
  const count = await query(
    prisma,
    "SELECT count(*)::int AS total FROM projects p WHERE p.deleted_at IS NULL AND " +
      countScope,
    countValues,
  );
  values.push(limit, (page - 1) * limit);
  const { rows } = await query(
    prisma,
    "SELECT p.id,p.name,p.status,count(t.id)::int AS total_tasks,count(t.id) FILTER(WHERE t.status='COMPLETED')::int AS completed_tasks,count(t.id) FILTER(WHERE t.status<>'COMPLETED')::int AS pending_tasks,count(t.id) FILTER(WHERE t.status<>'COMPLETED' AND t.due_date<CURRENT_DATE)::int AS overdue_tasks,COALESCE(round(100.0*count(t.id) FILTER(WHERE t.status='COMPLETED')/NULLIF(count(t.id),0),1),0)::float8 AS completion_percentage FROM projects p LEFT JOIN tasks t ON t.project_id=p.id AND t.deleted_at IS NULL AND " +
      tasks +
      " WHERE p.deleted_at IS NULL AND " +
      project +
      " GROUP BY p.id ORDER BY p.name,p.id LIMIT $" +
      (values.length - 1) +
      " OFFSET $" +
      values.length,
    values,
  );
  return {
    data: rows,
    meta: {
      total: count.rows[0].total,
      page,
      limit,
    },
  };
}
export async function dashboard(user) {
  const { where, values } = taskWhere(user);
  const countValues = [];
  const project = projectScope(user, countValues);
  // Every aggregation uses the exact same authorization predicate as the task listing.
  const [totals, projects, status, priority, distribution, loads, progress] =
    await Promise.all([
      query(
        prisma,
        "SELECT count(*)::int AS total_tasks,count(*) FILTER(WHERE t.status='COMPLETED')::int AS completed_tasks,count(*) FILTER(WHERE t.status<>'COMPLETED')::int AS pending_tasks,count(*) FILTER(WHERE t.status<>'COMPLETED' AND t.due_date<CURRENT_DATE)::int AS overdue_tasks" +
          joins +
          " WHERE " +
          where,
        values,
      ),
      query(
        prisma,
        "SELECT count(*)::int AS total_projects,count(*) FILTER(WHERE p.status='ACTIVE')::int AS active_projects FROM projects p WHERE p.deleted_at IS NULL AND " +
          project,
        countValues,
      ),
      query(
        prisma,
        "SELECT t.status AS label,count(*)::int AS count" +
          joins +
          " WHERE " +
          where +
          " GROUP BY t.status ORDER BY t.status",
        values,
      ),
      query(
        prisma,
        "SELECT t.priority AS label,count(*)::int AS count" +
          joins +
          " WHERE " +
          where +
          " GROUP BY t.priority ORDER BY t.priority",
        values,
      ),
      query(
        prisma,
        "SELECT COALESCE(u.name,'Unassigned') AS name,t.assignee_id AS id,count(*)::int AS count" +
          joins +
          " WHERE " +
          where +
          " GROUP BY u.name,t.assignee_id ORDER BY count DESC,name LIMIT 10",
        values,
      ),
      workload(user),
      performance(user, {
        page: 1,
        limit: 10,
      }),
    ]);
  return {
    ...totals.rows[0],
    ...projects.rows[0],
    byStatus: status.rows,
    byPriority: priority.rows,
    distribution: distribution.rows,
    workload: loads,
    performance: progress,
  };
}

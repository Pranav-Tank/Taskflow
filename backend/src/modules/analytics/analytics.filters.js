import { taskScope } from "./analytics.scope.js";
export const joins =
  " FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN users u ON u.id=t.assignee_id ";
export const columns = "t.*,p.name AS project_name,u.name AS assignee_name";
export function taskWhere(user, filters = {}, values = []) {
  const conditions = [
    "t.deleted_at IS NULL",
    "p.deleted_at IS NULL",
    taskScope(user, values),
  ];
  const add = (sql, value) => {
    values.push(value);
    conditions.push(sql.replaceAll("?", "$" + values.length));
  };
  if (filters.projectId) add("t.project_id=?::uuid", filters.projectId);
  if (filters.assigneeId) add("t.assignee_id=?::uuid", filters.assigneeId);
  if (filters.status) add("t.status=?::task_status", filters.status);
  if (filters.priority) add("t.priority=?::task_priority", filters.priority);
  if (filters.dueFrom) add("t.due_date>=?::date", filters.dueFrom);
  if (filters.dueTo) add("t.due_date<=?::date", filters.dueTo);
  if (filters.overdue)
    conditions.push("t.due_date<CURRENT_DATE AND t.status<>'COMPLETED'");
  if (filters.search) {
    // Treat %, _ and backslash as literal search characters, not client-controlled wildcards.
    const term = "%" + filters.search.replace(/[\\%_]/g, "\\$&") + "%";
    add(
      "(t.title ILIKE ? OR t.description ILIKE ? OR p.name ILIKE ? OR u.name ILIKE ?)",
      term,
    );
  }
  return {
    where: conditions.join(" AND "),
    values,
  };
}

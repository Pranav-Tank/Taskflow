// These clauses are part of SELECT/UPDATE eligibility in SQL, before paging or aggregation.
export function projectScope(user, values, alias = "p") {
  if (user.role === "ADMIN") return "TRUE";
  values.push(user.id);
  const bind = "$" + values.length + "::uuid";
  if (user.role === "MANAGER") return alias + ".manager_id=" + bind;
  return (
    "EXISTS(SELECT 1 FROM project_members scope_member WHERE scope_member.project_id=" +
    alias +
    ".id AND scope_member.user_id=" +
    bind +
    ")"
  );
}
export function taskScope(user, values, task = "t", project = "p") {
  const scope = projectScope(user, values, project);
  if (["ADMIN", "MANAGER"].includes(user.role)) return scope;
  values.push(user.id);
  const bind = "$" + values.length + "::uuid";
  if (user.role === "EMPLOYEE")
    return "(" + scope + " AND " + task + ".assignee_id=" + bind + ")";
  return (
    "(" +
    scope +
    " AND EXISTS(SELECT 1 FROM project_members team_member WHERE team_member.project_id=" +
    task +
    ".project_id AND team_member.user_id=" +
    task +
    ".assignee_id AND (team_member.user_id=" +
    bind +
    " OR team_member.team_lead_id=" +
    bind +
    ")))"
  );
}

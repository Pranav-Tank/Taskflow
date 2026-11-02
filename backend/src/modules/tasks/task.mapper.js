import { dateString } from "../../common/date.js";
export function taskView(row) {
  if (!row) return undefined;
  const { project, assigneeMember, ...task } = row;
  return {
    ...task,
    due_date: dateString(task.due_date),
    project_name: project?.name,
    assignee_name: assigneeMember?.user.name ?? null,
  };
}
export function historyView(row, relation) {
  const { [relation]: person, ...record } = row;
  return {
    ...record,
    author_name: person.name,
  };
}

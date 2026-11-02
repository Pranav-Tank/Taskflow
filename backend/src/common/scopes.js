export function projectWhere(user) {
  return {
    deleted_at: null,
    ...(user.role === "ADMIN"
      ? {}
      : user.role === "MANAGER"
        ? {
            manager_id: user.id,
          }
        : {
            members: {
              some: {
                user_id: user.id,
              },
            },
          }),
  };
}
export function taskWherePrisma(user) {
  const where = {
    deleted_at: null,
    project: {
      is: projectWhere(user),
    },
  };
  if (user.role === "EMPLOYEE") where.assignee_id = user.id;
  if (user.role === "TEAM_LEAD")
    where.assigneeMember = {
      is: {
        OR: [
          {
            user_id: user.id,
          },
          {
            team_lead_id: user.id,
          },
        ],
      },
    };
  return where;
}

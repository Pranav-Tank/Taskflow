export function projectView(row) {
  if (!row) return undefined;
  const { manager, ...data } = row;
  return {
    ...data,
    manager_name: manager?.name,
  };
}
export const memberView = (row) => ({
  ...row.user,
  team_lead_id: row.team_lead_id,
  team_lead_name: row.teamLead?.user.name ?? null,
});

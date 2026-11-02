const counts = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "bigint" ? Number(value) : value,
    ]),
  );
export const workloadView = (rows) => rows.map(counts);
export const performanceView = (result) => ({
  ...result,
  data: result.data.map((row) => ({
    ...counts(row),
    completion_percentage: Number(row.completion_percentage),
  })),
});
export const dashboardView = (result) => ({
  ...counts(result),
  byStatus: result.byStatus.map(counts),
  byPriority: result.byPriority.map(counts),
  distribution: result.distribution.map(counts),
  workload: workloadView(result.workload),
  performance: performanceView(result.performance),
});

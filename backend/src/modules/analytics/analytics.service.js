import * as repository from "./analytics.repository.js";
import {
  dashboardView,
  workloadView,
  performanceView,
} from "./analytics.mapper.js";
export const dashboard = async (user) =>
  dashboardView(await repository.dashboard(user));
export const workload = async (user) =>
  workloadView(await repository.workload(user));
export const performance = async (user, filters) =>
  performanceView(await repository.performance(user, filters));

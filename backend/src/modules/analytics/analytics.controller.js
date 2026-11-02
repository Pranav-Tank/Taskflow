import * as service from "./analytics.service.js";
import { success, paginated } from "../../common/response.js";
export const dashboard = async (req, res) =>
  success(res, await service.dashboard(req.user));
export const workload = async (req, res) =>
  success(res, await service.workload(req.user));
export const performance = async (req, res) =>
  paginated(res, await service.performance(req.user, req.input.query));

import { Router } from "express";
import { validate } from "../../lib/validation.js";
import { reportQuery } from "./analytics.validation.js";
import * as controller from "./analytics.controller.js";
const router = Router();
router.get("/dashboard", controller.dashboard);
router.get("/reports/workload", controller.workload);
router.get(
  "/reports/project-performance",
  validate(reportQuery, "query"),
  controller.performance,
);
export default router;

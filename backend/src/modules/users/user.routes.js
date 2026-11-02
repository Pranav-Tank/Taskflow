import { requestSchema1, requestSchema2 } from "./user.validation.js";
import { query } from "./user.validation.js";
import { Router } from "express";
import { allow } from "../../middleware/auth.js";
import { paramId, validate } from "../../lib/validation.js";
import * as controller from "./user.controller.js";
const router = Router();
router.get("/options", validate(query, "query"), controller.options);
router.get("/", allow("ADMIN"), validate(query, "query"), controller.list);
router.post("/", allow("ADMIN"), validate(requestSchema1), controller.create);
router.patch(
  "/:id",
  allow("ADMIN"),
  paramId,
  validate(requestSchema2),
  controller.update,
);
export default router;

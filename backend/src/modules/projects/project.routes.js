import {
  requestSchema1,
  requestSchema2,
  requestSchema3,
  requestSchema4,
  requestSchema5,
} from "./project.validation.js";
import { Router } from "express";
import { allow } from "../../middleware/auth.js";
import { paramId, validate } from "../../lib/validation.js";
import * as controller from "./project.controller.js";
const router = Router();
router.get("/", validate(requestSchema1, "query"), controller.list);
router.post(
  "/",
  allow("ADMIN", "MANAGER"),
  validate(requestSchema2),
  controller.create,
);
router.get("/:id", paramId, controller.get);
router.patch(
  "/:id",
  allow("ADMIN", "MANAGER"),
  paramId,
  validate(requestSchema3),
  controller.update,
);
router.delete("/:id", allow("ADMIN"), paramId, controller.remove);
router.put(
  "/:id/members",
  allow("ADMIN", "MANAGER"),
  paramId,
  validate(requestSchema4),
  controller.addMember,
);
router.delete(
  "/:id/members",
  allow("ADMIN", "MANAGER"),
  paramId,
  validate(requestSchema5),
  controller.removeMember,
);
export default router;

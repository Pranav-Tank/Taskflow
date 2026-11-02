import { Router } from "express";
import { Joi, paging, paramId, validate } from "../../lib/validation.js";
import { querySchema, createSchema, updateSchema } from "./task.validation.js";
import * as controller from "./task.controller.js";
const router = Router();
router.get("/", validate(querySchema, "query"), controller.list);
router.post("/", validate(createSchema), controller.create);
router.get("/:id", paramId, controller.get);
router.patch("/:id", paramId, validate(updateSchema), controller.update);
router.delete("/:id", paramId, controller.remove);
router.get(
  "/:id/comments",
  paramId,
  validate(Joi.object(paging), "query"),
  controller.comments,
);
router.post(
  "/:id/comments",
  paramId,
  validate(
    Joi.object({
      body: Joi.string().trim().min(1).max(4000).required(),
    }).required(),
  ),
  controller.comment,
);
router.get(
  "/:id/activity",
  paramId,
  validate(Joi.object(paging), "query"),
  controller.activity,
);
export default router;

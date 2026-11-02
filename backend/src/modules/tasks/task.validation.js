import {
  Joi,
  id,
  date,
  paging,
  statuses,
  priorities,
} from "../../lib/validation.js";
export const querySchema = Joi.object({
  ...paging,
  search: Joi.string().trim().max(150).allow(""),
  projectId: id,
  assigneeId: id,
  status: Joi.string().valid(...statuses),
  priority: Joi.string().valid(...priorities),
  dueFrom: date,
  dueTo: date,
  overdue: Joi.boolean().default(false),
  sortBy: Joi.string()
    .valid("dueDate", "createdAt", "updatedAt", "title", "status", "priority")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
}).custom((value, helpers) =>
  value.dueFrom && value.dueTo && value.dueFrom > value.dueTo
    ? helpers.error("any.invalid")
    : value,
);
const fields = {
  title: Joi.string().trim().min(3).max(200),
  description: Joi.string().trim().max(10000).allow(""),
  status: Joi.string().valid(...statuses),
  priority: Joi.string().valid(...priorities),
  assigneeId: id.allow(null),
  dueDate: date.allow(null),
  blockedReason: Joi.string().trim().max(1000).allow("", null),
};
export const createSchema = Joi.object({
  ...fields,
  title: fields.title.required(),
  projectId: id.required(),
  description: fields.description.default(""),
  status: fields.status.default("TODO"),
  priority: fields.priority.default("MEDIUM"),
  assigneeId: fields.assigneeId.default(null),
  dueDate: fields.dueDate.default(null),
}).required();
export const updateSchema = Joi.object(fields).min(1).required();

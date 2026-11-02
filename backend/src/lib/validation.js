import Joi from "joi";
import { AppError } from "./errors.js";
export { Joi };
export const id = Joi.string().guid({
  version: ["uuidv4", "uuidv5"],
});
export const paging = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};
export const statuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "BLOCKED",
];
export const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const roles = ["ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"];
export const date = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== value
      ? helpers.error("any.invalid")
      : value;
  });
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
    });
    if (result.error)
      return next(
        new AppError(
          "Validation failed",
          400,
          result.error.details.map((item) => item.message),
        ),
      );
    req.input ??= {};
    req.input[source] = result.value;
    next();
  };
}
export const paramId = validate(
  Joi.object({
    id: id.required(),
  }),
  "params",
);

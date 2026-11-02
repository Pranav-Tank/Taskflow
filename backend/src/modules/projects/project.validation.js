import { Joi, id, paging } from "../../lib/validation.js";
export const fields = {
  name: Joi.string().trim().min(3).max(160),
  description: Joi.string().trim().max(10000).allow(""),
  status: Joi.string().valid("PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"),
  managerId: id,
};
export const requestSchema1 = Joi.object({
  ...paging,
  search: Joi.string().trim().max(150).allow(""),
  status: fields.status,
});
export const requestSchema2 = Joi.object({
  ...fields,
  name: fields.name.required(),
  description: fields.description.default(""),
  status: fields.status.default("PLANNING"),
}).required();
export const requestSchema3 = Joi.object(fields).min(1).required();
export const requestSchema4 = Joi.object({
  userId: id.required(),
  teamLeadId: id.allow(null).default(null),
}).required();
export const requestSchema5 = Joi.object({
  userId: id.required(),
}).required();

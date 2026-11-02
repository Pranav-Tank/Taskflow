import { Joi, roles, paging } from "../../lib/validation.js";
export const query = Joi.object({
  ...paging,
  search: Joi.string().trim().max(150).allow(""),
  role: Joi.string().valid(...roles),
  active: Joi.boolean(),
});
export const fields = {
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .max(254),
  role: Joi.string().valid(...roles),
  active: Joi.boolean(),
  password: Joi.string().min(10).max(128),
};
export const requestSchema1 = Joi.object({
  ...fields,
  name: fields.name.required(),
  email: fields.email.required(),
  password: fields.password.required(),
  role: fields.role.default("EMPLOYEE"),
}).required();
export const requestSchema2 = Joi.object(fields).min(1).required();

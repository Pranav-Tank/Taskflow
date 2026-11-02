import { Joi } from "../../lib/validation.js";
export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .required(),
  password: Joi.string().max(128).required(),
}).required();

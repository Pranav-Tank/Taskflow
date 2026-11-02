import { Joi, paging } from "../../lib/validation.js";
export const reportQuery = Joi.object(paging);

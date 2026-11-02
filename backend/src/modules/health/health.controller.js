import { check } from "./health.service.js";
import { success } from "../../common/response.js";
export const health = async (req, res) => success(res, await check());
